import { describe, expect, it } from "vitest";
import {
  computeBudgetStatus,
  daysLeftInMonth,
  matchPot,
  summarizeDay,
  summarizeMonth,
  type FinanceSnapshot,
  type SnapshotEntry,
} from "./finance-snapshot";

const NOW = new Date("2026-09-24T09:00:00"); // 30-day month → 7 days left including today

let seq = 0;
const e = (p: Partial<SnapshotEntry>): SnapshotEntry => ({
  id: `e${++seq}`,
  amount: 10_000,
  type: "expense",
  category: "Ăn uống",
  note: "",
  date: "2026-09-24",
  createdAt: `2026-09-24T0${seq % 10}:00:00Z`,
  ...p,
});

const snap = (p: Partial<FinanceSnapshot>): FinanceSnapshot => ({ entries: [], pots: [], declaredIncome: 0, ...p });

describe("daysLeftInMonth", () => {
  it("counts today", () => {
    expect(daysLeftInMonth(NOW)).toBe(7);
    expect(daysLeftInMonth(new Date("2026-02-28T10:00:00"))).toBe(1);
  });
});

describe("summarizeDay", () => {
  it("sums only today's entries, split by type", () => {
    const s = snap({
      entries: [
        e({ amount: 35_000 }),
        e({ amount: 25_000 }),
        e({ amount: 500_000, type: "income", category: "Quà tặng" }),
        e({ amount: 99_000, date: "2026-09-23" }),
      ],
    });
    expect(summarizeDay(s, NOW)).toMatchObject({ date: "2026-09-24", spent: 60_000, earned: 500_000, count: 3 });
  });
});

describe("summarizeMonth", () => {
  it("prefers logged income, ranks categories, excludes other months", () => {
    const s = snap({
      declaredIncome: 20_000_000,
      entries: [
        e({ amount: 100_000, category: "Ăn uống" }),
        e({ amount: 300_000, category: "Mua sắm" }),
        e({ amount: 10_000_000, type: "income", category: "Lương" }),
        e({ amount: 1_000_000, date: "2026-08-30" }),
      ],
    });
    const m = summarizeMonth(s, NOW);
    expect(m).toMatchObject({ spent: 400_000, incomeSource: "logged", incomeBasis: 10_000_000, net: 9_600_000, count: 3 });
    expect(m.topCategories[0]).toEqual({ category: "Mua sắm", amount: 300_000 });
  });

  it("falls back to declared income, and reports unknown instead of inventing one", () => {
    expect(summarizeMonth(snap({ declaredIncome: 8_000_000, entries: [e({ amount: 1_000_000 })] }), NOW)).toMatchObject({
      incomeSource: "declared",
      net: 7_000_000,
    });
    expect(summarizeMonth(snap({ entries: [e({})] }), NOW)).toMatchObject({ incomeSource: "unknown", net: null });
  });
});

describe("computeBudgetStatus", () => {
  it("pots mode: per-pot remaining, overall remaining includes unassigned spending", () => {
    const s = snap({
      pots: [
        { id: "food", name: "Ăn uống", allocated: 3_000_000 },
        { id: "fun", name: "Giải trí", allocated: 500_000 },
        { id: "unused", name: "Chưa dùng", allocated: 0 },
      ],
      entries: [
        e({ amount: 1_000_000, potId: "food" }),
        e({ amount: 700_000, potId: "fun" }),
        e({ amount: 100_000 }), // unassigned
        e({ amount: 5_000_000, potId: "food", date: "2026-08-01" }), // last month
      ],
    });
    const b = computeBudgetStatus(s, NOW);
    expect(b.mode).toBe("pots");
    expect(b.totalBudget).toBe(3_500_000);
    expect(b.spent).toBe(1_800_000);
    expect(b.remaining).toBe(1_700_000);
    expect(b.dailyAllowance).toBe(242_000); // 1.700.000 / 7 = 242.857 → rounded down to the thousand
    expect(b.overBudgetPots.map((p) => [p.name, p.remaining])).toEqual([["Giải trí", -200_000]]);
    expect(b.limitations.join()).toMatch(/1 khoản chi chưa gắn vào hũ/);
  });

  it("income mode when there are no pots", () => {
    const b = computeBudgetStatus(snap({ declaredIncome: 10_000_000, entries: [e({ amount: 3_000_000 })] }), NOW);
    expect(b).toMatchObject({ mode: "income", remaining: 7_000_000, totalBudget: 10_000_000 });
    expect(b.limitations[0]).toMatch(/thu nhập khai báo/);
  });

  it("none mode: no fake remaining when nothing to compare against", () => {
    const b = computeBudgetStatus(snap({ entries: [e({ amount: 50_000 })] }), NOW);
    expect(b).toMatchObject({ mode: "none", remaining: null, dailyAllowance: null, spent: 50_000 });
  });

  it("over budget gives negative remaining and zero daily allowance", () => {
    const b = computeBudgetStatus(snap({ declaredIncome: 1_000_000, entries: [e({ amount: 1_500_000 })] }), NOW);
    expect(b.remaining).toBe(-500_000);
    expect(b.dailyAllowance).toBe(0);
  });

  it("ignores income entries when computing spend", () => {
    const b = computeBudgetStatus(snap({ declaredIncome: 1_000_000, entries: [e({ amount: 900_000, type: "income" })] }), NOW);
    expect(b.spent).toBe(0);
  });
});

describe("matchPot", () => {
  const pots = [
    { id: "1", name: "Thiết yếu", allocated: 1 },
    { id: "2", name: "Quần áo", allocated: 1 },
    { id: "3", name: "Hưởng thụ", allocated: 1 },
  ];
  it("matches by exact name, then by hint words", () => {
    expect(matchPot("Ăn uống", [{ id: "x", name: "ăn uống", allocated: 1 }])?.id).toBe("x");
    expect(matchPot("Ăn uống", pots)?.id).toBe("1");
    expect(matchPot("Giải trí", pots)?.id).toBe("3");
  });
  it("does not match on substrings ('an' in 'quần áo')", () => {
    expect(matchPot("Ăn uống", [{ id: "2", name: "Quần áo", allocated: 1 }])).toBeNull();
  });
  it("returns null when nothing fits or no pots", () => {
    expect(matchPot("Y tế", [{ id: "2", name: "Quần áo", allocated: 1 }])).toBeNull();
    expect(matchPot("Ăn uống", [])).toBeNull();
  });
});
