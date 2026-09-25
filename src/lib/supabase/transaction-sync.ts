/**
 * Supabase adapter for the transaction store's sync queue.
 *
 * Upserts by the client-generated id, so a retried push never creates a
 * duplicate row. Row ownership is enforced by RLS (`user_id = auth.uid()`).
 * Requires migration 20260924000000_expenses_transactions.sql for income rows
 * (`kind` column); until it is applied those ops stay pending instead of
 * pretending to be synced.
 */

import { createClient } from "./client";
import { getAuthUserId } from "./user-data";
import { configureRemoteSync, flushSyncQueue, type SyncOp } from "@/lib/stores/transaction-store";
import type { SnapshotEntry } from "@/lib/companion/finance-snapshot";

let userId: string | null = null;
let installed = false;

async function push(ops: SyncOp[], entries: Map<string, SnapshotEntry>) {
  const done: string[] = [];
  const failed: Record<string, string> = {};
  if (!userId) {
    for (const op of ops) failed[op.id] = "not signed in";
    return { done, failed };
  }
  const supabase = createClient();

  const upserts = ops.filter((o) => o.op === "upsert");
  const rows = upserts
    .map((o) => entries.get(o.id))
    .filter((e): e is SnapshotEntry => Boolean(e))
    .map((e) => ({
      id: e.id,
      user_id: userId,
      kind: e.type,
      pot_id: e.potId || null,
      amount: e.amount,
      note: e.note,
      category: e.category,
      txn_date: e.date,
      created_at: e.createdAt,
    }));
  // An upsert whose entry no longer exists locally was deleted meanwhile — nothing to push.
  for (const o of upserts) if (!entries.has(o.id)) done.push(o.id);

  if (rows.length > 0) {
    const { error } = await supabase.from("expenses").upsert(rows, { onConflict: "id" });
    for (const r of rows) {
      if (error) failed[r.id] = error.message;
      else done.push(r.id);
    }
  }

  for (const o of ops.filter((op) => op.op === "delete")) {
    const { error } = await supabase.from("expenses").delete().eq("id", o.id).eq("user_id", userId);
    if (error) failed[o.id] = error.message;
    else done.push(o.id);
  }

  return { done, failed };
}

/** Call once on the client. Safe to call repeatedly. */
export async function installTransactionSync(): Promise<boolean> {
  userId = await getAuthUserId();
  if (!installed) {
    installed = true;
    configureRemoteSync({ isLoggedIn: () => Boolean(userId), push });
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void flushSyncQueue());
    }
  }
  if (userId) void flushSyncQueue();
  return Boolean(userId);
}
