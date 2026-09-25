/**
 * Transaction store — the ONE write path for money movements.
 *
 * Before this, the budget page, the ledger and the old chat each wrote to
 * `vietfi_ledger`, `vietfi_expenses` and Supabase separately, with remote errors
 * swallowed (`.catch(() => {})`). Now every writer goes through here:
 *
 *  - Idempotent: a transaction id is written at most once (retries/double-clicks are no-ops).
 *  - Verified: after writing we read storage back; the caller gets what was actually saved.
 *  - Honest sync state: guests are "local", logged-in writes are "pending" until Supabase confirms.
 *  - Broadcast: `vietfi:finance-changed` lets every open view refresh immediately.
 */

import type { LedgerEntry } from "@/lib/storage";
import type { Expense, BudgetPot } from "@/lib/types/budget";
import type { FinanceSnapshot, SnapshotEntry } from "@/lib/companion/finance-snapshot";
import type { TransactionDraft } from "@/lib/companion/transaction-parser";

export const LEDGER_KEY = "vietfi_ledger";
export const EXPENSES_KEY = "vietfi_expenses";
export const POTS_KEY = "vietfi_pots";
export const INCOME_KEY = "vietfi_income";
export const SYNC_KEY = "vietfi_sync_queue";
export const FINANCE_CHANGED_EVENT = "vietfi:finance-changed";

export type SyncState = "local" | "pending" | "synced";

export interface SyncOp {
  id: string;
  op: "upsert" | "delete";
  attempts: number;
  /** When this op was queued; a newer op for the same id replaces it. */
  queuedAt: number;
  lastError?: string;
}

export class StorageWriteError extends Error {}

/* ─── Low-level storage (throws instead of silently failing) ─── */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") throw new StorageWriteError("Không có bộ nhớ trình duyệt");
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw new StorageWriteError(err instanceof Error ? err.message : "Không ghi được bộ nhớ");
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function notifyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FINANCE_CHANGED_EVENT));
}

/** Subscribe to finance changes from this tab and other tabs. Returns an unsubscribe fn. */
export function onFinanceChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || [LEDGER_KEY, EXPENSES_KEY, POTS_KEY, INCOME_KEY].includes(e.key)) cb();
  };
  window.addEventListener(FINANCE_CHANGED_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(FINANCE_CHANGED_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/* ─── Reads ─── */

function toDateKey(iso: string): string {
  // Expenses store full ISO datetimes; ledger stores YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isValidAmount(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

export function readSnapshot(): FinanceSnapshot {
  const ledger = asArray<LedgerEntry>(readJSON(LEDGER_KEY, [])).filter((e) => e && isValidAmount(e.amount));
  const expenses = asArray<Expense>(readJSON(EXPENSES_KEY, [])).filter((e) => e && isValidAmount(e.amount));
  const pots = asArray<BudgetPot>(readJSON(POTS_KEY, []));
  const income = Number(readJSON<unknown>(INCOME_KEY, 0)) || 0;

  const potByExpenseId = new Map(expenses.map((e) => [e.id, e.potId ?? e.pot_id ?? undefined]));
  const entries: SnapshotEntry[] = ledger.map((e) => ({
    id: e.id,
    amount: e.amount,
    type: e.type === "income" ? "income" : "expense",
    category: e.category || "Khác",
    note: e.note || "",
    date: toDateKey(e.date),
    createdAt: e.createdAt || e.date,
    potId: potByExpenseId.get(e.id) || undefined,
  }));

  // Legacy budget expenses that never got a ledger twin still count as spending.
  const ledgerIds = new Set(ledger.map((e) => e.id));
  for (const e of expenses) {
    if (ledgerIds.has(e.id)) continue;
    const pot = pots.find((p) => p.id === (e.potId ?? e.pot_id));
    entries.push({
      id: e.id,
      amount: e.amount,
      type: "expense",
      category: e.category || pot?.name || "Khác",
      note: e.note || "",
      date: toDateKey(e.date),
      createdAt: e.created_at || e.date,
      potId: e.potId ?? e.pot_id ?? undefined,
    });
  }

  return {
    entries,
    pots: pots.map((p) => ({ id: p.id, name: p.name, allocated: Number(p.allocated) || 0 })),
    declaredIncome: income > 0 ? income : 0,
  };
}

/* ─── Writes ─── */

export interface CommitInput extends Pick<TransactionDraft, "id" | "type" | "amount" | "category" | "note" | "date"> {
  potId?: string | null;
}

export interface CommitResult {
  saved: SnapshotEntry[];
  /** Ids that already existed — a retry or double submit. Nothing was written for them. */
  duplicates: string[];
  sync: SyncState;
}

function validate(input: CommitInput): string | null {
  if (!input.id) return "Thiếu mã giao dịch";
  if (!isValidAmount(input.amount) || input.amount > 10_000_000_000) return "Số tiền không hợp lệ";
  if (input.type !== "income" && input.type !== "expense") return "Loại giao dịch không hợp lệ";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Ngày không hợp lệ";
  return null;
}

let isLoggedIn: () => boolean = () => false;
let remoteSync: ((ops: SyncOp[], entries: Map<string, SnapshotEntry>) => Promise<{ done: string[]; failed: Record<string, string> }>) | null = null;

/** Wired by the Supabase adapter at app start; keeps this module free of network code. */
export function configureRemoteSync(opts: {
  isLoggedIn: () => boolean;
  push: NonNullable<typeof remoteSync>;
}): void {
  isLoggedIn = opts.isLoggedIn;
  remoteSync = opts.push;
}

export function commitTransactions(inputs: CommitInput[]): CommitResult {
  for (const input of inputs) {
    const problem = validate(input);
    if (problem) throw new StorageWriteError(problem);
  }

  const ledger = asArray<LedgerEntry>(readJSON(LEDGER_KEY, []));
  const expenses = asArray<Expense>(readJSON(EXPENSES_KEY, []));
  const existing = new Set([...ledger.map((e) => e.id), ...expenses.map((e) => e.id)]);

  const duplicates: string[] = [];
  const fresh: CommitInput[] = [];
  for (const input of inputs) {
    if (existing.has(input.id) || fresh.some((f) => f.id === input.id)) duplicates.push(input.id);
    else fresh.push(input);
  }

  const createdAt = new Date().toISOString();
  const newLedger: LedgerEntry[] = fresh.map((t) => ({
    id: t.id,
    amount: t.amount,
    type: t.type,
    category: t.category,
    note: t.note,
    date: t.date,
    createdAt,
  }));
  const newExpenses: Expense[] = fresh
    .filter((t) => t.type === "expense")
    .map((t) => ({
      id: t.id,
      potId: t.potId ?? "",
      amount: t.amount,
      note: t.note,
      category: t.category,
      date: new Date(`${t.date}T12:00:00`).toISOString(),
    }));

  if (fresh.length > 0) {
    const prevLedger = ledger;
    writeJSON(LEDGER_KEY, [...ledger, ...newLedger]);
    try {
      if (newExpenses.length > 0) writeJSON(EXPENSES_KEY, [...expenses, ...newExpenses]);
    } catch (err) {
      // Keep the two keys consistent: roll back the ledger write.
      try { writeJSON(LEDGER_KEY, prevLedger); } catch { /* best effort */ }
      throw err;
    }
  }

  // Verify against storage — report only what is really there.
  const after = readSnapshot();
  const byId = new Map(after.entries.map((e) => [e.id, e]));
  const saved = fresh.map((t) => byId.get(t.id)).filter((e): e is SnapshotEntry => Boolean(e));
  if (saved.length !== fresh.length) {
    throw new StorageWriteError("Ghi xong nhưng đọc lại không thấy đủ giao dịch");
  }

  const sync = enqueueSync(saved.map((e) => ({ id: e.id, op: "upsert" as const, attempts: 0, queuedAt: Date.now() })));
  if (fresh.length > 0) notifyChanged();
  return { saved, duplicates, sync };
}

export function deleteTransaction(id: string): { deleted: boolean; sync: SyncState } {
  const ledger = asArray<LedgerEntry>(readJSON(LEDGER_KEY, []));
  const expenses = asArray<Expense>(readJSON(EXPENSES_KEY, []));
  const nextLedger = ledger.filter((e) => e.id !== id);
  const nextExpenses = expenses.filter((e) => e.id !== id);
  if (nextLedger.length === ledger.length && nextExpenses.length === expenses.length) {
    return { deleted: false, sync: "local" };
  }
  writeJSON(LEDGER_KEY, nextLedger);
  writeJSON(EXPENSES_KEY, nextExpenses);
  if (readSnapshot().entries.some((e) => e.id === id)) throw new StorageWriteError("Xóa chưa thành công");
  const sync = enqueueSync([{ id, op: "delete", attempts: 0, queuedAt: Date.now() }]);
  notifyChanged();
  return { deleted: true, sync };
}

export function updateTransactionAmount(id: string, amount: number): { entry: SnapshotEntry; sync: SyncState } {
  if (!isValidAmount(amount) || amount > 10_000_000_000) throw new StorageWriteError("Số tiền không hợp lệ");
  const ledger = asArray<LedgerEntry>(readJSON(LEDGER_KEY, []));
  const expenses = asArray<Expense>(readJSON(EXPENSES_KEY, []));
  if (!ledger.some((e) => e.id === id) && !expenses.some((e) => e.id === id)) {
    throw new StorageWriteError("Không tìm thấy giao dịch");
  }
  writeJSON(LEDGER_KEY, ledger.map((e) => (e.id === id ? { ...e, amount } : e)));
  writeJSON(EXPENSES_KEY, expenses.map((e) => (e.id === id ? { ...e, amount } : e)));
  const entry = readSnapshot().entries.find((e) => e.id === id);
  if (!entry || entry.amount !== amount) throw new StorageWriteError("Sửa chưa thành công");
  const sync = enqueueSync([{ id, op: "upsert", attempts: 0, queuedAt: Date.now() }]);
  notifyChanged();
  return { entry, sync };
}

/* ─── Remote sync queue (logged-in users) ─── */

export function readSyncQueue(): SyncOp[] {
  return asArray<SyncOp>(readJSON(SYNC_KEY, []));
}

function enqueueSync(ops: SyncOp[]): SyncState {
  if (!isLoggedIn() || !remoteSync || ops.length === 0) return "local";
  const queue = readSyncQueue();
  for (const op of ops) {
    const idx = queue.findIndex((q) => q.id === op.id);
    if (idx >= 0) queue[idx] = op; // latest op for an id wins
    else queue.push(op);
  }
  try {
    writeJSON(SYNC_KEY, queue);
  } catch {
    return "local";
  }
  void flushSyncQueue();
  return "pending";
}

let flushing: Promise<void> | null = null;

/** Push pending ops to Supabase. Safe to call often; concurrent calls share one run. */
export function flushSyncQueue(): Promise<void> {
  if (flushing) return flushing;
  if (!isLoggedIn() || !remoteSync) return Promise.resolve();
  const push = remoteSync;
  flushing = (async () => {
    const queue = readSyncQueue();
    if (queue.length === 0) return;
    const entries = new Map(readSnapshot().entries.map((e) => [e.id, e]));
    let result: { done: string[]; failed: Record<string, string> };
    try {
      result = await push(queue, entries);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "sync failed";
      result = { done: [], failed: Object.fromEntries(queue.map((q) => [q.id, msg])) };
    }
    // Re-read: new ops may have been queued while we were pushing.
    const current = readSyncQueue();
    const next = current
      .filter((q) => !result.done.includes(q.id) || queue.find((o) => o.id === q.id)?.queuedAt !== q.queuedAt)
      .map((q) => (result.failed[q.id] ? { ...q, attempts: q.attempts + 1, lastError: result.failed[q.id] } : q));
    try { writeJSON(SYNC_KEY, next); } catch { /* retried next time */ }
    window.dispatchEvent(new CustomEvent(FINANCE_CHANGED_EVENT));
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
