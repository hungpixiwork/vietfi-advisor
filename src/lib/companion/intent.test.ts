import { describe, expect, it } from "vitest";
import { detectIntent } from "./intent";

const NOW = new Date("2026-09-24T09:00:00");
const kind = (text: string, pendingItem?: string) => detectIntent(text, { pendingItem }, NOW).kind;

describe("detectIntent (tier 1, no API)", () => {
  it.each([
    ["Ăn sáng 30k", "log"],
    ["Cà phê 25 nghìn", "log"],
    ["tiền trọ 3tr5", "log"],
    ["Hôm nay tiêu bao nhiêu?", "query_today"],
    ["hôm nay xài hết bao nhiêu", "query_today"],
    ["Ngân sách còn lại?", "query_budget"],
    ["ngân sách", "query_budget"],
    ["còn bao nhiêu tiền để tiêu?", "query_budget"],
    ["hôm nay còn tiêu được bao nhiêu?", "query_budget"],
    ["Tháng này thế nào?", "query_month"],
    ["tháng này ăn uống hết bao nhiêu?", "query_month"],
    ["Xóa khoản vừa ghi", "undo_last"],
    ["hoàn tác", "undo_last"],
    ["thôi không ghi nữa", "cancel"],
    ["hủy", "cancel"],
    ["bạn làm được gì?", "help"],
    ["chào Vẹt", "greeting"],
    ["giá vàng hôm nay có nên mua không", "unknown"],
  ])("%s → %s", (text, expected) => {
    expect(kind(text)).toBe(expected);
  });

  it("parses an edit with a new amount", () => {
    expect(detectIntent("sửa khoản vừa rồi thành 40k", {}, NOW)).toEqual({ kind: "edit_last", amount: 40_000 });
  });

  it("asks for the amount when a spend has none", () => {
    expect(detectIntent("ăn phở", {}, NOW)).toEqual({ kind: "ask_amount", item: "ăn phở" });
  });

  it("completes the pending item with a bare amount reply", () => {
    const intent = detectIntent("35k", { pendingItem: "ăn phở" }, NOW);
    expect(intent.kind).toBe("log");
    if (intent.kind === "log") {
      expect(intent.drafts).toHaveLength(1);
      expect(intent.drafts[0]).toMatchObject({ amount: 35_000, category: "Ăn uống" });
    }
  });

  it("a question containing an amount is not logged as a transaction", () => {
    expect(kind("ngân sách còn 2 triệu không?")).toBe("query_budget");
  });
});
