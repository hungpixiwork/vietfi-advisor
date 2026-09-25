/**
 * Tier 1 — deterministic intent detection. Handles the everyday messages
 * (log a spend, "hôm nay tiêu bao nhiêu?", "ngân sách còn?") with 0 API calls.
 * Anything it cannot place returns `unknown` and may go to the LLM tier.
 */

import { findAmounts, parseAmount } from "./amount";
import { looksLikeSpending } from "./categories";
import { parseTransactions, type TransactionDraft } from "./transaction-parser";

export type CompanionIntent =
  | { kind: "log"; drafts: TransactionDraft[] }
  | { kind: "ask_amount"; item: string }
  | { kind: "query_today" }
  | { kind: "query_month" }
  | { kind: "query_budget" }
  | { kind: "undo_last" }
  | { kind: "edit_last"; amount: number }
  | { kind: "cancel" }
  | { kind: "help" }
  | { kind: "greeting" }
  | { kind: "unknown" };

export interface IntentContext {
  /** Item Vẹt Vàng just asked the price of ("Bát phở bao nhiêu?"). */
  pendingItem?: string | null;
}

const has = (re: RegExp, s: string) => re.test(s);

const QUESTION_RE = /\?|bao nhiêu|mấy|còn không|còn ko|thế nào|ra sao|như nào|sao rồi|có nên|nên không|(không|ko|chưa)\s*$/u;

export function detectIntent(input: string, ctx: IntentContext = {}, now: Date = new Date()): CompanionIntent {
  const text = input.trim();
  const lower = text.toLowerCase();
  if (!lower) return { kind: "unknown" };

  if (has(/^(thôi|hủy|huỷ|khỏi|bỏ qua|không ghi|ko ghi|đừng ghi|cancel)(?![\p{L}])/u, lower)) return { kind: "cancel" };

  if (has(/(hoàn tác|undo|xóa|xoá|bỏ)\s*(giao dịch|khoản|cái|món)?\s*(vừa|cuối|mới|lúc nãy|vừa rồi|vừa ghi|gần nhất)/u, lower) || lower === "hoàn tác") {
    return { kind: "undo_last" };
  }

  if (has(/(sửa|đổi|chỉnh)\s*(lại)?\s*(giao dịch|khoản|cái|món)?\s*(vừa|cuối|mới|lúc nãy|vừa rồi|vừa ghi|gần nhất)?/u, lower)) {
    const amount = parseAmount(lower);
    if (amount) return { kind: "edit_last", amount };
  }

  const isQuestion = has(QUESTION_RE, lower);
  if (isQuestion) {
    if (has(/ngân sách|budget|còn (bao nhiêu|mấy|lại)|được tiêu|tiêu được|còn tiêu|hũ/u, lower)) return { kind: "query_budget" };
    if (has(/tháng (này|nay)|cả tháng|tháng rồi|tổng quan|tình hình|tổng kết/u, lower)) return { kind: "query_month" };
    if (has(/(hôm nay|ngày nay|nay).*(tiêu|chi|xài|tốn|hết)|(tiêu|chi|xài|tốn).*hôm nay/u, lower)) return { kind: "query_today" };
    if (has(/(tiêu|chi|xài|tốn) (hết )?(bao nhiêu|mấy)/u, lower)) return { kind: "query_today" };
  }
  if (has(/^(ngân sách|budget)( còn lại)?$/u, lower)) return { kind: "query_budget" };
  if (has(/^(tổng quan|tình hình tài chính|tổng kết tháng)$/u, lower)) return { kind: "query_month" };

  // Answer to "X bao nhiêu tiền?" — a bare amount completes the pending item.
  if (ctx.pendingItem) {
    const amounts = findAmounts(lower);
    const onlyAmount = amounts.length === 1 && lower.replace(amounts[0].raw.toLowerCase(), "").replace(/[^\p{L}\d]/gu, "").length <= 6;
    if (onlyAmount) {
      const drafts = parseTransactions(`${ctx.pendingItem} ${text}`, now);
      if (drafts.length > 0) return { kind: "log", drafts };
    }
  }

  if (!isQuestion) {
    const drafts = parseTransactions(text, now);
    if (drafts.length > 0) return { kind: "log", drafts };
    if (looksLikeSpending(lower) && lower.split(/\s+/).length <= 8) return { kind: "ask_amount", item: text };
  }

  if (has(/^(help|trợ giúp|hướng dẫn|làm được gì|bạn làm được gì|giúp gì)/u, lower) || has(/làm được (những )?gì/u, lower)) {
    return { kind: "help" };
  }
  if (has(/^(hi|hello|chào|xin chào|alo|hế lô|hey|yo)(?![\p{L}])/u, lower)) return { kind: "greeting" };

  return { kind: "unknown" };
}
