/**
 * Financial Engine — money questions Vẹt Vàng answers from real data.
 *
 * Pure functions over a snapshot. No UI, no LLM, no storage.
 * Every result says which data it used and what is missing, so replies never
 * present a guess as a fact.
 */

import { toLocalDateKey } from "./transaction-parser";

export interface SnapshotEntry {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  potId?: string;
}

export interface SnapshotPot {
  id: string;
  name: string;
  allocated: number;
}

export interface FinanceSnapshot {
  entries: SnapshotEntry[];
  pots: SnapshotPot[];
  /** Monthly income the user declared during setup (0 = unknown). */
  declaredIncome: number;
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function sum(entries: SnapshotEntry[], type: "income" | "expense"): number {
  return entries.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);
}

function byCategory(entries: SnapshotEntry[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense") continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Remaining ÷ days left, rounded DOWN to the thousand — a conservative, readable daily limit. */
function allowance(remaining: number, daysLeft: number): number {
  return Math.max(0, Math.floor(remaining / daysLeft / 1000) * 1000);
}

export function daysLeftInMonth(now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1; // today counts
}

/* ─── get_spending_today ─── */

export interface DaySummary {
  date: string;
  spent: number;
  earned: number;
  count: number;
  items: SnapshotEntry[];
}

export function summarizeDay(snapshot: FinanceSnapshot, now: Date): DaySummary {
  const today = toLocalDateKey(now);
  const items = snapshot.entries.filter((e) => e.date === today);
  return { date: today, spent: sum(items, "expense"), earned: sum(items, "income"), count: items.length, items };
}

/* ─── get_financial_summary (month) ─── */

export interface MonthSummary {
  month: string;
  spent: number;
  earnedLogged: number;
  /** Income used for cash-flow math: logged income this month, else the declared monthly income. */
  incomeBasis: number;
  incomeSource: "logged" | "declared" | "unknown";
  net: number | null;
  topCategories: CategoryTotal[];
  count: number;
}

export function summarizeMonth(snapshot: FinanceSnapshot, now: Date): MonthSummary {
  const month = toLocalDateKey(now).slice(0, 7);
  const items = snapshot.entries.filter((e) => monthKey(e.date) === month);
  const spent = sum(items, "expense");
  const earnedLogged = sum(items, "income");
  const incomeSource = earnedLogged > 0 ? "logged" : snapshot.declaredIncome > 0 ? "declared" : "unknown";
  const incomeBasis = incomeSource === "logged" ? earnedLogged : incomeSource === "declared" ? snapshot.declaredIncome : 0;
  return {
    month,
    spent,
    earnedLogged,
    incomeBasis,
    incomeSource,
    net: incomeSource === "unknown" ? null : incomeBasis - spent,
    topCategories: byCategory(items).slice(0, 3),
    count: items.length,
  };
}

/* ─── get_budget_status ─── */

export interface PotStatus {
  potId: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  /** 0..100+, share of the pot used */
  usedPct: number;
}

export interface BudgetStatus {
  mode: "pots" | "income" | "none";
  /** Total left to spend this month; null when there is no budget or income to compare against. */
  remaining: number | null;
  totalBudget: number;
  spent: number;
  /** Remaining divided by days left, including today. */
  dailyAllowance: number | null;
  daysLeft: number;
  pots: PotStatus[];
  overBudgetPots: PotStatus[];
  limitations: string[];
}

export function computeBudgetStatus(snapshot: FinanceSnapshot, now: Date): BudgetStatus {
  const month = toLocalDateKey(now).slice(0, 7);
  const monthExpenses = snapshot.entries.filter((e) => e.type === "expense" && monthKey(e.date) === month);
  const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const daysLeft = daysLeftInMonth(now);
  const limitations: string[] = [];

  const budgetPots = snapshot.pots.filter((p) => p.allocated > 0);
  if (budgetPots.length > 0) {
    const pots = budgetPots.map((p) => {
      const potSpent = monthExpenses.filter((e) => e.potId === p.id).reduce((s, e) => s + e.amount, 0);
      return {
        potId: p.id,
        name: p.name,
        allocated: p.allocated,
        spent: potSpent,
        remaining: p.allocated - potSpent,
        usedPct: Math.round((potSpent / p.allocated) * 100),
      };
    });
    const totalBudget = budgetPots.reduce((s, p) => s + p.allocated, 0);
    const unassigned = monthExpenses.filter((e) => !e.potId || !budgetPots.some((p) => p.id === e.potId));
    const unassignedTotal = unassigned.reduce((s, e) => s + e.amount, 0);
    if (unassignedTotal > 0) limitations.push(`${unassigned.length} khoản chi chưa gắn vào hũ nào`);
    // Unassigned spending still leaves the wallet, so it reduces the overall remaining.
    const remaining = totalBudget - spent;
    return {
      mode: "pots",
      remaining,
      totalBudget,
      spent,
      dailyAllowance: allowance(remaining, daysLeft),
      daysLeft,
      pots,
      overBudgetPots: pots.filter((p) => p.remaining < 0),
      limitations,
    };
  }

  if (snapshot.declaredIncome > 0) {
    limitations.push("Chưa chia hũ ngân sách — đang lấy thu nhập khai báo làm ngân sách tháng");
    const remaining = snapshot.declaredIncome - spent;
    return {
      mode: "income",
      remaining,
      totalBudget: snapshot.declaredIncome,
      spent,
      dailyAllowance: allowance(remaining, daysLeft),
      daysLeft,
      pots: [],
      overBudgetPots: [],
      limitations,
    };
  }

  limitations.push("Chưa có thu nhập hoặc hũ ngân sách để so sánh");
  return {
    mode: "none",
    remaining: null,
    totalBudget: 0,
    spent,
    dailyAllowance: null,
    daysLeft,
    pots: [],
    overBudgetPots: [],
    limitations,
  };
}

/* ─── Pot matching for new expenses ─── */

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

const CATEGORY_POT_HINTS: Record<string, string[]> = {
  "Ăn uống": ["an uong", "an", "do an", "thuc pham", "cho", "thiet yeu", "sinh hoat", "chi tieu"],
  "Đi lại": ["di lai", "xang", "xe", "thiet yeu", "sinh hoat", "chi tieu"],
  "Nhà ở": ["nha", "tro", "thue", "hoa don", "thiet yeu", "sinh hoat", "co dinh"],
  "Y tế": ["y te", "suc khoe", "thuoc", "thiet yeu"],
  "Học tập": ["hoc", "giao duc", "phat trien"],
  "Giải trí": ["giai tri", "huong thu", "vui choi", "choi"],
  "Mua sắm": ["mua sam", "shopping", "huong thu", "ca nhan"],
  "Đầu tư": ["dau tu", "tiet kiem", "tu do tai chinh", "tich luy"],
  "Từ thiện": ["tu thien", "cho di", "qua", "hieu hi"],
};

/** Best budget pot for a category, or null to let the user choose. */
export function matchPot(category: string, pots: SnapshotPot[]): SnapshotPot | null {
  if (pots.length === 0) return null;
  const target = fold(category);
  const exact = pots.find((p) => fold(p.name) === target);
  if (exact) return exact;
  for (const hint of CATEGORY_POT_HINTS[category] ?? []) {
    // Whole-word match on the folded name: "an" must not match "quần áo" → "quan ao".
    const hit = pots.find((p) => ` ${fold(p.name).replace(/[^a-z0-9]+/g, " ")} `.includes(` ${hint} `));
    if (hit) return hit;
  }
  return null;
}
