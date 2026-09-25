"use client";
import { useState, useEffect, useCallback } from "react";
import { getLedgerEntries, LedgerEntry } from "@/lib/storage";
import { commitTransactions, deleteTransaction as removeFromStore, onFinanceChanged } from "@/lib/stores/transaction-store";
import { newId } from "@/lib/companion/transaction-parser";

export type Period = "today" | "month";

/* ─── State shape ─── */

interface UiState {
  inputOpen: boolean;
  period: Period;
  loading: boolean;
  error: string | null;
}

interface LedgerState {
  transactions: LedgerEntry[];
  ui: UiState;
  undoQueue: Array<{ action: "add" | "delete"; entry: LedgerEntry }>;
}

/* ─── Helpers ─── */

/**
 * Format a raw VND amount as a display string like "150.000đ"
 */
export function formatVND(amount: number): string {
  const formatted = new Intl.NumberFormat("vi-VN").format(Math.round(amount));
  return `${formatted}đ`;
}

/**
 * Parse a VND input string like "150.000" or "150,000" → 150000
 */
export function parseVNDInput(text: string): number {
  const cleaned = text
    .replace(/\s+/g, "")
    .replace(/đ$/, "")
    .replace(/\.(?=\d{3})/g, "")   // remove thousand separators (.)
    .replace(/,(?=\d{3})/g, "")   // remove thousand separators (,)
    .trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/* ─── Custom hook store (no zustand) ─── */
// Reads the ledger from storage; every write goes through the transaction store
// so the budget page, Vẹt Vàng and this view never overwrite each other.

export function useLedgerStore() {
  const [state, setState] = useState<LedgerState>({
    transactions: [],
    ui: {
      inputOpen: false,
      period: "month",
      loading: true,
      error: null,
    },
    undoQueue: [],
  });

  const loadFromStorage = useCallback(() => {
    try {
      const entries = getLedgerEntries();
      setState((prev) => ({
        ...prev,
        transactions: entries,
        ui: { ...prev.ui, loading: false, error: null },
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        ui: { ...prev.ui, loading: false, error: "Không tải được dữ liệu" },
      }));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadFromStorage, 0);
    const unsubscribe = onFinanceChanged(loadFromStorage);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [loadFromStorage]);

  const fail = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : "Không lưu được";
    setState((prev) => ({ ...prev, ui: { ...prev.ui, error: message } }));
  }, []);

  /* ─── Actions ─── */

  const addTransaction = useCallback(
    (data: Omit<LedgerEntry, "id" | "createdAt">) => {
      try {
        const { saved } = commitTransactions([{ ...data, id: newId() }]);
        const entry = getLedgerEntries().find((e) => e.id === saved[0]?.id);
        loadFromStorage();
        if (entry) {
          setState((prev) => ({
            ...prev,
            undoQueue: [...prev.undoQueue.slice(-9), { action: "add", entry }],
          }));
        }
      } catch (err) {
        fail(err);
      }
    },
    [fail, loadFromStorage]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const removed = getLedgerEntries().find((t) => t.id === id);
      if (!removed) return;
      try {
        removeFromStore(id);
        loadFromStorage();
        setState((prev) => ({
          ...prev,
          undoQueue: [...prev.undoQueue.slice(-9), { action: "delete", entry: removed }],
        }));
      } catch (err) {
        fail(err);
      }
    },
    [fail, loadFromStorage]
  );

  const undoLast = useCallback(() => {
    const last = state.undoQueue[state.undoQueue.length - 1];
    if (!last) return;
    try {
      if (last.action === "add") removeFromStore(last.entry.id);
      else commitTransactions([last.entry]);
      loadFromStorage();
      setState((prev) => ({ ...prev, undoQueue: prev.undoQueue.slice(0, -1) }));
    } catch (err) {
      fail(err);
    }
  }, [state.undoQueue, fail, loadFromStorage]);

  const setPeriod = useCallback((period: Period) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, period },
    }));
  }, []);

  const setInputOpen = useCallback((inputOpen: boolean) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, inputOpen },
    }));
  }, []);

  return {
    ...state,
    addTransaction,
    deleteTransaction,
    undoLast,
    setPeriod,
    setInputOpen,
    loadFromStorage,
  };
}
