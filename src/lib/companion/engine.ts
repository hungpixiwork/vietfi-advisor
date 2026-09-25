/**
 * Vẹt Vàng orchestrator: intent → tool → verified numbers → reply.
 *
 * Tools only READ here. Anything that changes data comes back as a `proposal`
 * the user must confirm; the UI executes it through the transaction store and
 * reports what the store actually saved.
 */

import {
  computeBudgetStatus,
  summarizeDay,
  summarizeMonth,
  type FinanceSnapshot,
  type SnapshotEntry,
} from "./finance-snapshot";
import type { CompanionIntent } from "./intent";
import type { TransactionDraft } from "./transaction-parser";

export type Proposal =
  | { kind: "create"; drafts: TransactionDraft[] }
  | { kind: "delete"; entry: SnapshotEntry }
  | { kind: "update"; entry: SnapshotEntry; patch: { amount: number } };

export interface CompanionReply {
  text: string;
  /** Optional one-line data caveat, rendered muted under the reply. */
  note?: string;
  proposal?: Proposal;
  /** Set when Vẹt Vàng asked for a missing amount for this item. */
  pendingItem?: string;
  /** Which tool produced the numbers — shown in dev tools / tests, never invented by the LLM. */
  tool?: ToolName;
}

export type ToolName =
  | "create_transaction"
  | "get_spending_today"
  | "get_financial_summary"
  | "get_budget_status"
  | "undo_transaction"
  | "update_transaction";

export function formatVnd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat("vi-VN").format(Math.round(Math.abs(amount)))}đ`;
}

/** Compact form for tight spaces: 60k, 3,74tr. */
export function formatVndShort(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sign}${(Math.floor(abs / 10_000) / 100).toLocaleString("vi-VN")}tr`;
  if (abs >= 1_000) return `${sign}${Math.floor(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}đ`;
}

function lastEntry(snapshot: FinanceSnapshot): SnapshotEntry | null {
  if (snapshot.entries.length === 0) return null;
  return [...snapshot.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function describeDrafts(drafts: TransactionDraft[]): string {
  const expense = drafts.filter((d) => d.type === "expense").reduce((s, d) => s + d.amount, 0);
  const income = drafts.filter((d) => d.type === "income").reduce((s, d) => s + d.amount, 0);
  const parts: string[] = [];
  if (expense > 0) parts.push(`chi ${formatVnd(expense)}`);
  if (income > 0) parts.push(`thu ${formatVnd(income)}`);
  const n = drafts.length;
  return `Bạn vừa ${parts.join(" và ")}. Mình đã chuẩn bị ${n} giao dịch — kiểm tra rồi bấm Lưu nhé.`;
}

export const HELP_TEXT =
  "Mình là Vẹt Vàng 🦜 — thư ký tài chính của bạn. Thử nói:\n" +
  "• \"Ăn phở 35k, cà phê 25k\" — ghi nhiều khoản một lúc\n" +
  "• \"Nhận lương 12 triệu\" — ghi thu nhập\n" +
  "• \"Hôm nay tiêu bao nhiêu?\" · \"Ngân sách còn bao nhiêu?\"\n" +
  "• \"Sửa khoản vừa rồi thành 40k\" · \"Xóa khoản vừa ghi\"";

export function respond(intent: CompanionIntent, snapshot: FinanceSnapshot, now: Date = new Date()): CompanionReply {
  switch (intent.kind) {
    case "log":
      return { text: describeDrafts(intent.drafts), proposal: { kind: "create", drafts: intent.drafts }, tool: "create_transaction" };

    case "ask_amount":
      return {
        text: `"${intent.item}" hết bao nhiêu tiền vậy? Gõ số thôi là được, ví dụ "35k".`,
        pendingItem: intent.item,
      };

    case "query_today": {
      const day = summarizeDay(snapshot, now);
      if (day.count === 0) {
        return { text: "Hôm nay chưa ghi khoản nào. Ví điện tử yên bình hay bạn quên ghi đấy? 🦜", tool: "get_spending_today" };
      }
      const lines = day.items
        .slice(-5)
        .map((e) => `• ${e.note || e.category}: ${e.type === "income" ? "+" : "-"}${formatVnd(e.amount)}`)
        .join("\n");
      const earned = day.earned > 0 ? ` và thu ${formatVnd(day.earned)}` : "";
      return {
        text: `Hôm nay bạn đã chi ${formatVnd(day.spent)}${earned} qua ${day.count} giao dịch:\n${lines}`,
        tool: "get_spending_today",
      };
    }

    case "query_month": {
      const m = summarizeMonth(snapshot, now);
      if (m.count === 0 && m.incomeSource === "unknown") {
        return { text: "Tháng này chưa có dữ liệu nào. Ghi khoản đầu tiên đi, ví dụ \"ăn sáng 30k\".", tool: "get_financial_summary" };
      }
      const top = m.topCategories.map((c) => `${c.category} ${formatVnd(c.amount)}`).join(", ");
      const incomeLine =
        m.incomeSource === "logged"
          ? `Thu đã ghi: ${formatVnd(m.earnedLogged)}.`
          : m.incomeSource === "declared"
            ? `Thu nhập khai báo: ${formatVnd(m.incomeBasis)}/tháng.`
            : "Chưa có thu nhập nên chưa tính được dòng tiền ròng.";
      const netLine = m.net === null ? "" : ` Dòng tiền còn lại: ${formatVnd(m.net)}.`;
      return {
        text: `Tháng ${m.month.slice(5)}: đã chi ${formatVnd(m.spent)} (${m.count} giao dịch).${top ? ` Nhiều nhất: ${top}.` : ""} ${incomeLine}${netLine}`,
        note: m.incomeSource === "declared" ? "Dòng tiền dựa trên thu nhập bạn khai báo, không phải thu nhập đã ghi." : undefined,
        tool: "get_financial_summary",
      };
    }

    case "query_budget": {
      const b = computeBudgetStatus(snapshot, now);
      if (b.mode === "none") {
        return {
          text: `Tháng này bạn đã chi ${formatVnd(b.spent)}, nhưng mình chưa biết ngân sách của bạn. Vào "Dòng tiền & Ngân sách" để nhập thu nhập hoặc chia hũ, mình sẽ tính giúp số còn được tiêu.`,
          note: b.limitations.join(" · "),
          tool: "get_budget_status",
        };
      }
      const remaining = b.remaining ?? 0;
      const head =
        remaining >= 0
          ? `Ngân sách tháng còn ${formatVnd(remaining)} / ${formatVnd(b.totalBudget)}. Còn ${b.daysLeft} ngày → tiêu tối đa khoảng ${formatVnd(b.dailyAllowance ?? 0)}/ngày.`
          : `Bạn đã vượt ngân sách tháng ${formatVnd(-remaining)} (chi ${formatVnd(b.spent)} / ${formatVnd(b.totalBudget)}). Phanh lại thôi! 🦜`;
      const over = b.overBudgetPots.length > 0 ? `\nHũ vượt mức: ${b.overBudgetPots.map((p) => `${p.name} (${formatVnd(-p.remaining)})`).join(", ")}.` : "";
      return { text: head + over, note: b.limitations.join(" · ") || undefined, tool: "get_budget_status" };
    }

    case "undo_last": {
      const last = lastEntry(snapshot);
      if (!last) return { text: "Chưa có giao dịch nào để xóa." };
      return {
        text: `Xóa khoản "${last.note || last.category}" ${formatVnd(last.amount)} ngày ${last.date.split("-").reverse().join("/")}?`,
        proposal: { kind: "delete", entry: last },
        tool: "undo_transaction",
      };
    }

    case "edit_last": {
      const last = lastEntry(snapshot);
      if (!last) return { text: "Chưa có giao dịch nào để sửa." };
      return {
        text: `Sửa khoản "${last.note || last.category}" từ ${formatVnd(last.amount)} thành ${formatVnd(intent.amount)}?`,
        proposal: { kind: "update", entry: last, patch: { amount: intent.amount } },
        tool: "update_transaction",
      };
    }

    case "cancel":
      return { text: "Ok, bỏ qua. Không ghi gì cả." };

    case "help":
      return { text: HELP_TEXT };

    case "greeting":
      return { text: "Chào bạn! Hôm nay tiêu gì rồi, khai thật đi 🦜 Ví dụ: \"ăn sáng 30k\"." };

    case "unknown":
    default:
      return {
        text: "Mình chưa hiểu câu này. Mình giỏi nhất là ghi thu chi và báo ngân sách — thử \"cà phê 25k\" hoặc \"hôm nay tiêu bao nhiêu?\".",
      };
  }
}
