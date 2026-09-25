import { describe, expect, it } from "vitest";
import { formatVnd, formatVndShort, respond } from "./engine";
import type { FinanceSnapshot, SnapshotEntry } from "./finance-snapshot";

const NOW = new Date("2026-09-24T09:00:00");
const entry = (p: Partial<SnapshotEntry>): SnapshotEntry => ({
  id: "x", amount: 50_000, type: "expense", category: "Ăn uống", note: "Trà sữa", date: "2026-09-24", createdAt: "2026-09-24T02:00:00Z", ...p,
});
const snap = (p: Partial<FinanceSnapshot> = {}): FinanceSnapshot => ({ entries: [], pots: [], declaredIncome: 0, ...p });

describe("formatters", () => {
  it("formats VND in full and compact form", () => {
    expect(formatVnd(1_234_567)).toBe("1.234.567đ");
    expect(formatVnd(-500_000)).toBe("-500.000đ");
    expect(formatVndShort(60_000)).toBe("60k");
    expect(formatVndShort(9_940_000)).toBe("9,94tr");
    expect(formatVndShort(-1_500_000)).toBe("-1,5tr");
    expect(formatVndShort(800)).toBe("800đ");
  });
});

describe("respond — every number comes from the engine", () => {
  it("budget question without any budget says what is missing instead of inventing a number", () => {
    const r = respond({ kind: "query_budget" }, snap({ entries: [entry({})] }), NOW);
    expect(r.text).toContain("đã chi 50.000đ");
    expect(r.text).toContain("chưa biết ngân sách");
    expect(r.note).toMatch(/Chưa có thu nhập/);
    expect(r.tool).toBe("get_budget_status");
  });

  it("over budget names the overspent amount and pots", () => {
    const r = respond(
      { kind: "query_budget" },
      snap({ pots: [{ id: "f", name: "Ăn uống", allocated: 40_000 }], entries: [entry({ potId: "f" })] }),
      NOW,
    );
    expect(r.text).toContain("vượt ngân sách tháng 10.000đ");
    expect(r.text).toContain("Hũ vượt mức: Ăn uống (10.000đ)");
  });

  it("month summary flags declared income as an assumption", () => {
    const r = respond({ kind: "query_month" }, snap({ declaredIncome: 5_000_000, entries: [entry({})] }), NOW);
    expect(r.text).toContain("Thu nhập khai báo: 5.000.000đ/tháng");
    expect(r.text).toContain("Dòng tiền còn lại: 4.950.000đ");
    expect(r.note).toMatch(/không phải thu nhập đã ghi/);
  });

  it("month summary without data or income asks for the first entry", () => {
    expect(respond({ kind: "query_month" }, snap(), NOW).text).toMatch(/chưa có dữ liệu/);
  });

  it("today with nothing logged", () => {
    expect(respond({ kind: "query_today" }, snap(), NOW).text).toMatch(/chưa ghi khoản nào/);
  });

  it("undo/edit target the most recently created entry and never act without one", () => {
    const s = snap({ entries: [entry({ id: "old", createdAt: "2026-09-24T01:00:00Z" }), entry({ id: "new", note: "Cơm", createdAt: "2026-09-24T03:00:00Z" })] });
    const undo = respond({ kind: "undo_last" }, s, NOW);
    expect(undo.proposal).toMatchObject({ kind: "delete", entry: { id: "new" } });
    const edit = respond({ kind: "edit_last", amount: 40_000 }, s, NOW);
    expect(edit.proposal).toMatchObject({ kind: "update", entry: { id: "new" }, patch: { amount: 40_000 } });
    expect(respond({ kind: "undo_last" }, snap(), NOW).proposal).toBeUndefined();
    expect(respond({ kind: "edit_last", amount: 1_000 }, snap(), NOW).proposal).toBeUndefined();
  });

  it("log describes income and expense totals and returns a create proposal", () => {
    const r = respond(
      {
        kind: "log",
        drafts: [
          { id: "1", type: "income", amount: 1_000_000, category: "Lương", note: "", date: "2026-09-24", assumptions: [], categoryConfidence: 1 },
          { id: "2", type: "expense", amount: 30_000, category: "Ăn uống", note: "", date: "2026-09-24", assumptions: [], categoryConfidence: 1 },
        ],
      },
      snap(),
      NOW,
    );
    expect(r.text).toContain("chi 30.000đ và thu 1.000.000đ");
    expect(r.proposal?.kind).toBe("create");
  });

  it("ask_amount keeps the item pending for the next message", () => {
    expect(respond({ kind: "ask_amount", item: "ăn phở" }, snap(), NOW).pendingItem).toBe("ăn phở");
  });
});
