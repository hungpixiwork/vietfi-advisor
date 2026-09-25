"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectIntent, type CompanionIntent } from "@/lib/companion/intent";
import { respond, formatVnd, type Proposal } from "@/lib/companion/engine";
import { computeBudgetStatus, matchPot, type FinanceSnapshot } from "@/lib/companion/finance-snapshot";
import { newId, toLocalDateKey, type TransactionDraft } from "@/lib/companion/transaction-parser";
import type { InterpretResult } from "@/lib/companion/llm-interpret";
import {
  commitTransactions,
  deleteTransaction,
  onFinanceChanged,
  readSnapshot,
  StorageWriteError,
  updateTransactionAmount,
  type SyncState,
} from "@/lib/stores/transaction-store";
import { installTransactionSync } from "@/lib/supabase/transaction-sync";
import { addXP } from "@/lib/gamification";

export type ProposalState = "open" | "saving" | "done" | "cancelled" | "error";

export interface EditableDraft extends TransactionDraft {
  potId: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  note?: string;
  proposal?: Proposal;
  /** Drafts as currently edited in the card (create proposals only). */
  drafts?: EditableDraft[];
  proposalState?: ProposalState;
  /** Outcome line after executing a proposal — built from what storage returned. */
  outcome?: string;
  createdAt: string;
}

const HISTORY_KEY = "vietfi_companion_history";
const MAX_HISTORY = 40;
const INTERPRET_TIMEOUT_MS = 9000;
const SPOKEN_NUMBER_RE = /(?<![\p{L}])(một|hai|ba|bốn|tư|năm|lăm|sáu|bảy|tám|chín|mười|mươi|chục|trăm|nghìn|ngàn|triệu)(?![\p{L}])/u;

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // A card left mid-save by a closed tab cannot be trusted as saved.
    return parsed.map((m: ChatMessage) => (m.proposalState === "saving" ? { ...m, proposalState: "open" } : m));
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {
    /* history is a convenience; losing it never loses money data */
  }
}

function syncLabel(sync: SyncState): string {
  if (sync === "pending") return "Đã lưu trên máy, đang đồng bộ lên tài khoản.";
  if (sync === "synced") return "Đã đồng bộ lên tài khoản.";
  return "Đã lưu trên thiết bị này (chưa đăng nhập nên chưa sao lưu đám mây).";
}

function budgetLine(snapshot: FinanceSnapshot): string {
  const b = computeBudgetStatus(snapshot, new Date());
  if (b.remaining === null) return "";
  return b.remaining >= 0
    ? ` Ngân sách tháng còn ${formatVnd(b.remaining)}.`
    : ` Bạn đang vượt ngân sách tháng ${formatVnd(-b.remaining)}.`;
}

function withPots(drafts: TransactionDraft[], snapshot: FinanceSnapshot): EditableDraft[] {
  return drafts.map((d) => ({
    ...d,
    potId: d.type === "expense" ? matchPot(d.category, snapshot.pots)?.id ?? null : null,
  }));
}

function shiftDate(now: Date, days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

/** Map a validated Tier-2 result onto the same intents Tier 1 produces. */
function fromInterpretation(result: Extract<InterpretResult, { status: "ok" }>, now: Date): CompanionIntent {
  switch (result.intent) {
    case "log":
      return {
        kind: "log",
        drafts: result.transactions.map((t) => ({
          id: newId(),
          type: t.type,
          amount: t.amount,
          category: t.category,
          note: t.note || t.category,
          date: shiftDate(now, t.dayOffset),
          assumptions: t.amountVerified ? ["AI đọc câu này — kiểm tra lại trước khi lưu"] : ["Số tiền do AI suy ra, không khớp chữ số trong câu — kiểm tra kỹ"],
          categoryConfidence: 0.6,
        })),
      };
    case "edit_last":
      return result.editAmount ? { kind: "edit_last", amount: result.editAmount } : { kind: "unknown" };
    default:
      return { kind: result.intent };
  }
}

async function interpretRemote(message: string): Promise<InterpretResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTERPRET_TIMEOUT_MS);
  try {
    const res = await fetch("/api/companion/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
    if (!res.ok) return { status: "unavailable", reason: `http ${res.status}` };
    return (await res.json()) as InterpretResult;
  } catch {
    return { status: "unavailable", reason: controller.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

export function useCompanion() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>({ entries: [], pots: [], declaredIncome: 0 });
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const pendingItem = useRef<string | null>(null);
  const hydrated = useRef(false);
  const inFlight = useRef(new Set<string>());
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    setMessages(loadHistory());
    setSnapshot(readSnapshot());
    hydrated.current = true;
    installTransactionSync().then(setSignedIn).catch(() => setSignedIn(false));
    return onFinanceChanged(() => setSnapshot(readSnapshot()));
  }, []);

  useEffect(() => {
    if (hydrated.current) saveHistory(messages);
  }, [messages]);

  const patch = useCallback((id: string, update: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...update } : m)));
  }, []);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, 500);
    if (!text || busy) return;
    const now = new Date();
    const userMsg: ChatMessage = { id: newId(), role: "user", text, createdAt: now.toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    const current = readSnapshot();
    let intent = detectIntent(text, { pendingItem: pendingItem.current }, now);
    let aiNote: string | undefined;

    // Tier 2 only when tier 1 is stuck: unknown sentences, or a spend whose amount is
    // spelled in words ("bún chả bốn lăm") that the deterministic parser does not read.
    const spelledAmount = intent.kind === "ask_amount" && SPOKEN_NUMBER_RE.test(text.toLowerCase());
    if (intent.kind === "unknown" || spelledAmount) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (intent.kind === "unknown") aiNote = "Đang offline nên mình chỉ hiểu các câu đơn giản. Ghi chép và xem ngân sách vẫn dùng được.";
      } else {
        setBusy(true);
        const result = await interpretRemote(text);
        setBusy(false);
        if (result.status === "ok" && (intent.kind === "unknown" || result.intent === "log")) intent = fromInterpretation(result, now);
        else if (result.status === "unavailable" && intent.kind === "unknown") aiNote = "AI tạm thời không phản hồi — mình trả lời bằng chế độ cơ bản.";
      }
    }

    const reply = respond(intent, current, now);
    pendingItem.current = reply.pendingItem ?? null;
    const assistant: ChatMessage = {
      id: newId(),
      role: "assistant",
      text: reply.text,
      note: [reply.note, aiNote].filter(Boolean).join(" · ") || undefined,
      proposal: reply.proposal,
      drafts: reply.proposal?.kind === "create" ? withPots(reply.proposal.drafts, current) : undefined,
      proposalState: reply.proposal ? "open" : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistant]);
  }, [busy]);

  const editDraft = useCallback((messageId: string, draftId: string, update: Partial<EditableDraft>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== messageId || !m.drafts
          ? m
          : { ...m, drafts: m.drafts.map((d) => (d.id === draftId ? { ...d, ...update } : d)) },
      ),
    );
  }, []);

  const removeDraft = useCallback((messageId: string, draftId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id !== messageId || !m.drafts ? m : { ...m, drafts: m.drafts.filter((d) => d.id !== draftId) })),
    );
  }, []);

  const confirm = useCallback((clicked: ChatMessage) => {
    // Use the latest edits: an amount field commits on blur, right before this click.
    const message = messagesRef.current.find((m) => m.id === clicked.id) ?? clicked;
    if (message.proposalState !== "open" || !message.proposal) return;
    // A double tap arrives before React re-renders the card; the store would dedupe
    // the write anyway, but this keeps the first outcome message intact.
    if (inFlight.current.has(message.id)) return;
    inFlight.current.add(message.id);
    patch(message.id, { proposalState: "saving" });
    try {
      const p = message.proposal;
      if (p.kind === "create") {
        const drafts = message.drafts ?? [];
        if (drafts.length === 0) {
          patch(message.id, { proposalState: "cancelled", outcome: "Không còn khoản nào để lưu." });
          return;
        }
        const result = commitTransactions(drafts.map((d) => ({ ...d, potId: d.potId })));
        const fresh = readSnapshot();
        const total = result.saved.reduce((s, e) => s + (e.type === "expense" ? e.amount : 0), 0);
        const parts: string[] = [];
        if (result.saved.length > 0) {
          parts.push(`✓ Đã lưu ${result.saved.length} giao dịch${total > 0 ? ` (chi ${formatVnd(total)})` : ""}.${budgetLine(fresh)}`);
          if (result.saved.some((e) => e.type === "expense")) addXP("log_expense");
        }
        if (result.duplicates.length > 0) parts.push(`${result.duplicates.length} khoản đã được lưu trước đó nên không ghi lại.`);
        patch(message.id, { proposalState: "done", outcome: `${parts.join(" ")} ${syncLabel(result.sync)}`.trim() });
      } else if (p.kind === "delete") {
        const r = deleteTransaction(p.entry.id);
        patch(message.id, {
          proposalState: "done",
          outcome: r.deleted ? `✓ Đã xóa "${p.entry.note || p.entry.category}".${budgetLine(readSnapshot())}` : "Giao dịch này không còn nữa (có thể đã xóa trước đó).",
        });
      } else {
        const r = updateTransactionAmount(p.entry.id, p.patch.amount);
        patch(message.id, {
          proposalState: "done",
          outcome: `✓ Đã sửa thành ${formatVnd(r.entry.amount)}.${budgetLine(readSnapshot())}`,
        });
      }
      setSnapshot(readSnapshot());
    } catch (err) {
      const reason = err instanceof StorageWriteError ? err.message : "lỗi không xác định";
      patch(message.id, { proposalState: "error", outcome: `✗ Chưa lưu được: ${reason}. Dữ liệu của bạn chưa thay đổi.` });
    } finally {
      inFlight.current.delete(message.id);
    }
  }, [patch]);

  const cancel = useCallback((message: ChatMessage) => {
    if (message.proposalState !== "open" && message.proposalState !== "error") return;
    patch(message.id, { proposalState: "cancelled", outcome: "Đã hủy, không ghi gì." });
  }, [patch]);

  const retry = useCallback((message: ChatMessage) => {
    patch(message.id, { proposalState: "open", outcome: undefined });
  }, [patch]);

  const clearHistory = useCallback(() => {
    pendingItem.current = null;
    setMessages([]);
  }, []);

  return { messages, snapshot, busy, signedIn, send, confirm, cancel, retry, editDraft, removeDraft, clearHistory };
}
