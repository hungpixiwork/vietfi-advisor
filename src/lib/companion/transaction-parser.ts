/**
 * Turns a chat sentence into transaction DRAFTS (never saved directly).
 *
 * "Sáng nay ăn phở 35k, chiều uống cà phê 25k" → 2 drafts.
 * Drafts go to a confirmation card; only the user's confirm writes to storage.
 */

import { findAmounts, type AmountMatch } from "./amount";
import { detectTransactionType, guessCategory, type TransactionType } from "./categories";

export interface TransactionDraft {
  /** Client-generated id. Also the idempotency key: saving the same draft twice is a no-op. */
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  /** YYYY-MM-DD (local time) */
  date: string;
  /** Things we guessed and the user should glance at. */
  assumptions: string[];
  categoryConfidence: number;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(now: Date, days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d;
}

/** "hôm qua" / "hôm kia" apply to the clause they appear in and every clause after it. */
function detectDayOffset(text: string): number | null {
  const lower = text.toLowerCase();
  if (/hôm kia/u.test(lower)) return -2;
  if (/hôm qua|tối qua|sáng qua|trưa qua|chiều qua/u.test(lower)) return -1;
  if (/hôm nay|sáng nay|trưa nay|chiều nay|tối nay|vừa|mới/u.test(lower)) return 0;
  return null;
}

const FILLER = [
  "sáng nay", "trưa nay", "chiều nay", "tối nay", "hôm nay", "hôm qua", "hôm kia", "tối qua", "sáng qua", "trưa qua", "chiều qua",
  "buổi sáng", "buổi trưa", "buổi chiều", "buổi tối", "sáng", "trưa", "chiều", "tối", "đêm",
  "mình", "tôi", "tao", "tớ", "em", "anh", "chị", "vừa mới", "vừa", "mới", "đã", "thì", "là", "có",
  "hết", "mất", "tốn", "khoảng", "tầm", "cỡ", "giá", "với", "ghi", "ghi lại", "ghi giúp", "giúp", "nhé", "nha", "ạ",
];

const FILLER_RE = new RegExp(
  `(?<![\\p{L}])(${FILLER.sort((a, b) => b.length - a.length).map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}])`,
  "giu",
);

function cleanNote(clause: string, amount: AmountMatch, clauseStart: number): string {
  const withoutAmount =
    clause.slice(0, amount.start - clauseStart) + " " + clause.slice(amount.end - clauseStart);
  const note = withoutAmount
    .replace(FILLER_RE, " ")
    .replace(/[,;.!?:+\-–—()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return note.length > 0 ? note.charAt(0).toUpperCase() + note.slice(1) : "";
}

// Split points between transactions: punctuation and connective words.
const SPLIT_RE = /[,;\n]+|\s+(?:và|rồi|xong|sau đó|thêm|với lại|còn|\+)\s+/giu;

interface Clause {
  text: string;
  start: number;
}

function splitClauses(text: string, amounts: AmountMatch[]): Clause[] {
  const clauses: Clause[] = [];
  let last = 0;
  SPLIT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SPLIT_RE.exec(text)) !== null) {
    const s = m.index;
    const e = s + m[0].length;
    // Never split inside an amount ("1,2 triệu", "1,200,000")
    if (amounts.some((a) => s < a.end && e > a.start)) continue;
    clauses.push({ text: text.slice(last, m.index), start: last });
    last = m.index + m[0].length;
  }
  clauses.push({ text: text.slice(last), start: last });
  return clauses.filter((c) => c.text.trim().length > 0);
}

export function parseTransactions(text: string, now: Date = new Date()): TransactionDraft[] {
  const amounts = findAmounts(text);
  if (amounts.length === 0) return [];

  const clauses = splitClauses(text, amounts);
  const drafts: TransactionDraft[] = [];
  let carryOffset: number | null = null;
  let carryContext = "";

  for (const clause of clauses) {
    const clauseEnd = clause.start + clause.text.length;
    const inClause = amounts.filter((a) => a.start >= clause.start && a.end <= clauseEnd);
    const offset = detectDayOffset(clause.text);
    if (offset !== null) carryOffset = offset;

    if (inClause.length === 0) {
      // e.g. "sáng nay" alone before "ăn phở 35k" — keep as context for the next clause
      carryContext = `${carryContext} ${clause.text}`.trim();
      continue;
    }

    // Several amounts in one clause without separators ("phở 35k cà phê 25k"):
    // cut the clause right after each amount.
    let segStart = clause.start;
    inClause.forEach((amount, idx) => {
      const segEnd = idx === inClause.length - 1 ? clauseEnd : amount.end;
      const segment = text.slice(segStart, segEnd);
      const context = `${carryContext} ${segment}`.trim();
      const type = detectTransactionType(context);
      const { category, confidence } = guessCategory(context, type);
      const note = cleanNote(segment, amount, segStart) || category;
      const assumptions = amount.assumption ? [amount.assumption] : [];
      if (confidence < 0.5) assumptions.push("Chưa rõ danh mục — chọn lại nếu cần");

      drafts.push({
        id: newId(),
        type,
        amount: amount.amount,
        category,
        note,
        date: toLocalDateKey(shiftDays(now, carryOffset ?? 0)),
        assumptions,
        categoryConfidence: confidence,
      });
      segStart = segEnd;
    });
    carryContext = "";
  }

  return drafts;
}
