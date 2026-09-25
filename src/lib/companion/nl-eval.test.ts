/**
 * Vietnamese NL evaluation set for the deterministic tier.
 *
 * Unlike the unit tests, these sentences were written as "how people actually
 * type", not tuned to the parser. We measure and report accuracy instead of
 * requiring 100%; misses are listed so they can drive parser work or tier-2 routing.
 * A miss here is acceptable only if it lands in `unknown`/`ask_amount` (goes to
 * the AI tier or asks the user) — never a confidently wrong amount.
 */
import { describe, expect, it } from "vitest";
import { detectIntent } from "./intent";

const NOW = new Date("2026-09-24T12:00:00");

type Case = { text: string; intent: string; amounts?: number[] };

const CASES: Case[] = [
  // logging — single
  { text: "trưa nay cơm tấm 40k", intent: "log", amounts: [40_000] },
  { text: "đổ xăng 70 nghìn", intent: "log", amounts: [70_000] },
  { text: "grab về nhà 32k", intent: "log", amounts: [32_000] },
  { text: "tiền điện tháng này 450k", intent: "log", amounts: [450_000] },
  { text: "đóng học phí 3tr2", intent: "log", amounts: [3_200_000] },
  { text: "mua sách 125.000đ", intent: "log", amounts: [125_000] },
  { text: "Netflix 260000", intent: "log", amounts: [260_000] },
  { text: "nạp điện thoại 100k", intent: "log", amounts: [100_000] },
  { text: "khám răng 1,5 triệu", intent: "log", amounts: [1_500_000] },
  { text: "trà sữa ba chục", intent: "log", amounts: [30_000] },
  { text: "tiền trọ 2 triệu rưỡi", intent: "log", amounts: [2_500_000] },
  { text: "bánh tráng trộn 15k nha", intent: "log", amounts: [15_000] },
  { text: "Highlands 55K", intent: "log", amounts: [55_000] },
  { text: "mừng cưới bạn 500k", intent: "log", amounts: [500_000] },
  { text: "gửi xe 5 nghìn", intent: "log", amounts: [5_000] },
  // logging — multiple
  { text: "sáng bánh mì 20k trưa cơm 35k tối lẩu 150k", intent: "log", amounts: [20_000, 35_000, 150_000] },
  { text: "cafe 29k + bánh 25k", intent: "log", amounts: [29_000, 25_000] },
  { text: "đi chợ 230k; mua thuốc 80k", intent: "log", amounts: [230_000, 80_000] },
  { text: "xăng 50k rồi rửa xe 40k", intent: "log", amounts: [50_000, 40_000] },
  // income
  { text: "lương về 15tr", intent: "log", amounts: [15_000_000] },
  { text: "nhận tiền freelance 2.500.000", intent: "log", amounts: [2_500_000] },
  { text: "được thưởng tết 5 triệu", intent: "log", amounts: [5_000_000] },
  // questions
  { text: "nay tiêu hết nhiêu rồi?", intent: "query_today" },
  { text: "hôm nay mình chi bao nhiêu", intent: "query_today" },
  { text: "còn bao nhiêu để tiêu tháng này?", intent: "query_budget" },
  { text: "ngân sách tháng này còn không", intent: "query_budget" },
  { text: "tháng này chi tiêu thế nào", intent: "query_month" },
  { text: "tổng kết tháng", intent: "query_month" },
  // edit / undo / cancel
  { text: "sửa lại khoản vừa rồi thành 45k", intent: "edit_last" },
  { text: "xoá cái vừa ghi đi", intent: "undo_last" },
  { text: "thôi bỏ đi", intent: "cancel" },
  // should NOT be logged (go to AI tier / ask)
  { text: "có nên mua iphone 15 triệu không", intent: "unknown" },
  { text: "lãi suất tiết kiệm bây giờ bao nhiêu?", intent: "unknown" },
  { text: "mua trà sữa", intent: "ask_amount" },
  { text: "tui mới đi ăn lẩu với bạn", intent: "ask_amount" },
];

describe("NL evaluation — deterministic tier", () => {
  const results = CASES.map((c) => {
    const got = detectIntent(c.text, {}, NOW);
    const amounts = got.kind === "log" ? got.drafts.map((d) => d.amount) : undefined;
    const intentOk = got.kind === c.intent;
    const amountOk = !c.amounts || JSON.stringify(amounts) === JSON.stringify(c.amounts);
    return { ...c, got: got.kind, gotAmounts: amounts, ok: intentOk && amountOk, intentOk };
  });

  it("reports accuracy and misses", () => {
    const accuracy = results.filter((r) => r.ok).length / results.length;
    const misses = results.filter((r) => !r.ok).map((r) => `${r.text} → ${r.got} ${JSON.stringify(r.gotAmounts ?? "")}`);
    console.info(`[nl-eval] tier-1 accuracy ${(accuracy * 100).toFixed(1)}% (${results.length} cases)`);
    if (misses.length) console.info(`[nl-eval] misses:\n  ${misses.join("\n  ")}`);
    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });

  it("never logs a wrong amount with confidence (safety invariant)", () => {
    const wrongLogged = results.filter((r) => r.got === "log" && r.amounts && !r.ok);
    const loggedWhenItShouldNot = results.filter((r) => r.got === "log" && r.intent !== "log");
    expect(wrongLogged.map((r) => r.text)).toEqual([]);
    expect(loggedWhenItShouldNot.map((r) => r.text)).toEqual([]);
  });
});
