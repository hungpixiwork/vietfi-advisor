import { describe, expect, it } from "vitest";
import { parseTransactions } from "./transaction-parser";

const NOW = new Date("2026-09-24T09:00:00");

const brief = (text: string) =>
  parseTransactions(text, NOW).map((d) => ({ type: d.type, amount: d.amount, category: d.category, note: d.note, date: d.date }));

describe("parseTransactions", () => {
  it("splits the spec example into two food expenses totalling 60.000đ", () => {
    const drafts = brief("Sáng nay ăn phở 35k, chiều uống cà phê 25k");
    expect(drafts).toEqual([
      { type: "expense", amount: 35_000, category: "Ăn uống", note: "Ăn phở", date: "2026-09-24" },
      { type: "expense", amount: 25_000, category: "Ăn uống", note: "Uống cà phê", date: "2026-09-24" },
    ]);
    expect(drafts.reduce((s, d) => s + d.amount, 0)).toBe(60_000);
  });

  it("splits without punctuation", () => {
    expect(brief("phở 35k cà phê 25k").map((d) => d.amount)).toEqual([35_000, 25_000]);
  });

  it("splits on connectives and keeps 'hôm qua' for every clause after it", () => {
    const drafts = brief("hôm qua đổ xăng 50k và gửi xe 5k");
    expect(drafts.map((d) => [d.category, d.amount, d.date])).toEqual([
      ["Đi lại", 50_000, "2026-09-23"],
      ["Đi lại", 5_000, "2026-09-23"],
    ]);
  });

  it("never splits inside a decimal amount", () => {
    expect(brief("mua áo 1,2 triệu")).toEqual([
      { type: "expense", amount: 1_200_000, category: "Mua sắm", note: "Mua áo", date: "2026-09-24" },
    ]);
  });

  it("detects income", () => {
    expect(brief("nhận lương 12 triệu")[0]).toMatchObject({ type: "income", amount: 12_000_000, category: "Lương" });
    expect(brief("được mẹ cho 500k")[0]).toMatchObject({ type: "income", category: "Quà tặng" });
    expect(brief("thưởng dự án 2tr")[0]).toMatchObject({ type: "income", category: "Thưởng" });
  });

  it("treats 'mua' as spending even with 'được' nearby", () => {
    expect(brief("được giảm giá mua giày 300k")[0]).toMatchObject({ type: "expense", category: "Mua sắm" });
  });

  it("mixes income and expense in one sentence", () => {
    const drafts = brief("nhận lương 10tr rồi trả tiền nhà 3tr5");
    expect(drafts.map((d) => [d.type, d.amount, d.category])).toEqual([
      ["income", 10_000_000, "Lương"],
      ["expense", 3_500_000, "Nhà ở"],
    ]);
  });

  it("marks unknown categories for review instead of guessing silently", () => {
    const [d] = parseTransactions("linh tinh 40k", NOW);
    expect(d.category).toBe("Khác");
    expect(d.assumptions.join(" ")).toMatch(/Chưa rõ danh mục/);
  });

  it("gives every draft a unique id (the idempotency key)", () => {
    const drafts = parseTransactions("phở 35k, cà phê 25k, grab 40k", NOW);
    expect(new Set(drafts.map((d) => d.id)).size).toBe(3);
  });

  it("returns nothing when there is no amount", () => {
    expect(parseTransactions("ăn phở", NOW)).toEqual([]);
  });
});
