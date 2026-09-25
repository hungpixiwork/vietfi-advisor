import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitTransactions,
  configureRemoteSync,
  deleteTransaction,
  EXPENSES_KEY,
  FINANCE_CHANGED_EVENT,
  flushSyncQueue,
  LEDGER_KEY,
  onFinanceChanged,
  readSnapshot,
  readSyncQueue,
  StorageWriteError,
  updateTransactionAmount,
  type CommitInput,
} from "./transaction-store";

const tx = (p: Partial<CommitInput> = {}): CommitInput => ({
  id: `id-${Math.random().toString(36).slice(2)}`,
  type: "expense",
  amount: 35_000,
  category: "Ăn uống",
  note: "Phở",
  date: "2026-09-24",
  ...p,
});

const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? "[]");

beforeEach(() => {
  localStorage.clear();
  configureRemoteSync({ isLoggedIn: () => false, push: async () => ({ done: [], failed: {} }) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("commitTransactions", () => {
  it("writes the ledger and the budget mirror, and reports what storage holds", () => {
    const result = commitTransactions([tx({ id: "a", potId: "food" }), tx({ id: "b", type: "income", category: "Lương", amount: 1_000_000 })]);
    expect(result.saved.map((e) => e.id)).toEqual(["a", "b"]);
    expect(result.duplicates).toEqual([]);
    expect(result.sync).toBe("local");
    expect(read(LEDGER_KEY)).toHaveLength(2);
    // income never lands in budget expenses
    expect(read(EXPENSES_KEY).map((e: { id: string; potId: string }) => [e.id, e.potId])).toEqual([["a", "food"]]);
    expect(readSnapshot().entries.find((e) => e.id === "a")?.potId).toBe("food");
  });

  it("is idempotent: the same id saved twice (retry / double click) is written once", () => {
    const t = tx({ id: "same" });
    commitTransactions([t]);
    const again = commitTransactions([t, t]);
    expect(again.saved).toEqual([]);
    expect(again.duplicates).toEqual(["same", "same"]);
    expect(read(LEDGER_KEY)).toHaveLength(1);
    expect(read(EXPENSES_KEY)).toHaveLength(1);
  });

  it("never overwrites entries written by another view in the meantime", () => {
    commitTransactions([tx({ id: "from-budget-page" })]);
    commitTransactions([tx({ id: "from-chat" })]);
    expect(read(LEDGER_KEY).map((e: { id: string }) => e.id)).toEqual(["from-budget-page", "from-chat"]);
  });

  it.each([
    [{ amount: 0 }, /Số tiền/],
    [{ amount: -5 }, /Số tiền/],
    [{ amount: Number.NaN }, /Số tiền/],
    [{ amount: 20_000_000_000 }, /Số tiền/],
    [{ date: "24/09/2026" }, /Ngày/],
    [{ id: "" }, /mã/],
    [{ type: "gift" as never }, /Loại/],
  ])("rejects invalid input %o without writing anything", (patch, message) => {
    expect(() => commitTransactions([tx({ id: "ok" }), tx(patch)])).toThrow(message);
    expect(read(LEDGER_KEY)).toEqual([]);
  });

  it("rolls back the ledger when the second write fails (storage full) and reports failure", () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === EXPENSES_KEY) throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    });
    expect(() => commitTransactions([tx({ id: "x" })])).toThrow(StorageWriteError);
    expect(read(LEDGER_KEY)).toEqual([]);
  });

  it("broadcasts a change event only when something was written", () => {
    const cb = vi.fn();
    const off = onFinanceChanged(cb);
    const t = tx();
    commitTransactions([t]);
    commitTransactions([t]); // duplicate
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    commitTransactions([tx()]);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("readSnapshot", () => {
  it("includes legacy budget expenses that have no ledger twin, and tolerates corrupt storage", () => {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify([{ id: "legacy", potId: "p1", amount: 50_000, note: "", date: "2026-09-20T05:00:00.000Z" }]));
    localStorage.setItem("vietfi_pots", JSON.stringify([{ id: "p1", name: "Ăn uống", allocated: 2_000_000, iconKey: "Coffee", color: "#000" }]));
    localStorage.setItem("vietfi_income", "8000000");
    localStorage.setItem(LEDGER_KEY, "{not json");
    const s = readSnapshot();
    expect(s.entries).toEqual([expect.objectContaining({ id: "legacy", amount: 50_000, category: "Ăn uống", potId: "p1" })]);
    expect(s.declaredIncome).toBe(8_000_000);
    expect(s.pots).toEqual([{ id: "p1", name: "Ăn uống", allocated: 2_000_000 }]);
  });

  it("drops entries with invalid amounts instead of poisoning totals", () => {
    localStorage.setItem(LEDGER_KEY, JSON.stringify([{ id: "bad", amount: "abc", type: "expense" }, { id: "neg", amount: -1, type: "expense" }]));
    expect(readSnapshot().entries).toEqual([]);
  });
});

describe("delete and update", () => {
  it("delete removes from both stores; deleting again is a reported no-op", () => {
    commitTransactions([tx({ id: "d" })]);
    expect(deleteTransaction("d")).toEqual({ deleted: true, sync: "local" });
    expect(read(LEDGER_KEY)).toEqual([]);
    expect(read(EXPENSES_KEY)).toEqual([]);
    expect(deleteTransaction("d").deleted).toBe(false);
  });

  it("update changes the amount in both stores and returns the stored value", () => {
    commitTransactions([tx({ id: "u", amount: 35_000 })]);
    expect(updateTransactionAmount("u", 40_000).entry.amount).toBe(40_000);
    expect(read(EXPENSES_KEY)[0].amount).toBe(40_000);
    expect(() => updateTransactionAmount("missing", 1_000)).toThrow(/Không tìm thấy/);
    expect(() => updateTransactionAmount("u", 0)).toThrow(/Số tiền/);
  });
});

describe("remote sync queue (logged-in users)", () => {
  it("marks writes pending, then clears them once the remote confirms", async () => {
    const push = vi.fn(async (ops: { id: string }[]) => ({ done: ops.map((o) => o.id), failed: {} }));
    configureRemoteSync({ isLoggedIn: () => true, push });
    const r = commitTransactions([tx({ id: "s1" })]);
    expect(r.sync).toBe("pending");
    await flushSyncQueue();
    expect(push).toHaveBeenCalled();
    expect(readSyncQueue()).toEqual([]);
  });

  it("keeps failed ops queued with the error and attempt count (nothing claimed as synced)", async () => {
    const push = vi.fn(async (ops: { id: string }[]) => ({ done: [], failed: Object.fromEntries(ops.map((o) => [o.id, "offline"])) }));
    configureRemoteSync({ isLoggedIn: () => true, push });
    commitTransactions([tx({ id: "s2" })]);
    await flushSyncQueue();
    expect(readSyncQueue()).toEqual([expect.objectContaining({ id: "s2", op: "upsert", attempts: 1, lastError: "offline" })]);
  });

  it("a thrown push (network down) keeps everything queued", async () => {
    configureRemoteSync({ isLoggedIn: () => true, push: async () => { throw new Error("network"); } });
    commitTransactions([tx({ id: "s3" })]);
    await flushSyncQueue();
    expect(readSyncQueue()[0]).toMatchObject({ id: "s3", lastError: "network" });
  });

  it("a delete queued after an upsert replaces it (latest op wins)", async () => {
    configureRemoteSync({ isLoggedIn: () => true, push: async () => ({ done: [], failed: {} }) });
    commitTransactions([tx({ id: "s4" })]);
    deleteTransaction("s4");
    await flushSyncQueue();
    expect(readSyncQueue().filter((q) => q.id === "s4").map((q) => q.op)).toEqual(["delete"]);
  });

  it("dispatches the change event after a flush so the UI can refresh sync badges", async () => {
    configureRemoteSync({ isLoggedIn: () => true, push: async (ops) => ({ done: ops.map((o) => o.id), failed: {} }) });
    commitTransactions([tx()]);
    const cb = vi.fn();
    window.addEventListener(FINANCE_CHANGED_EVENT, cb);
    await flushSyncQueue();
    window.removeEventListener(FINANCE_CHANGED_EVENT, cb);
    expect(cb).toHaveBeenCalled();
  });
});
