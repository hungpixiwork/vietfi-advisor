"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, SendHorizonal, X } from "lucide-react";
import { computeBudgetStatus, summarizeDay } from "@/lib/companion/finance-snapshot";
import { formatVndShort } from "@/lib/companion/engine";
import { cn } from "@/lib/utils";
import ProposalCard from "./ProposalCard";
import { useCompanion, type ChatMessage } from "./useCompanion";

const QUICK_PROMPTS = ["Hôm nay tiêu bao nhiêu?", "Ngân sách còn bao nhiêu?", "Tháng này thế nào?", "Xóa khoản vừa ghi"];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Chào bạn, mình là Vẹt Vàng 🦜. Cứ gõ như nhắn tin: \"ăn phở 35k, cà phê 25k\" — mình soạn giao dịch, bạn bấm Lưu là xong.",
  createdAt: "",
};

export default function CompanionLauncher() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const companion = useCompanion();
  const { messages, snapshot, busy } = companion;
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = useMemo(() => {
    const now = new Date();
    return { day: summarizeDay(snapshot, now), budget: computeBudgetStatus(snapshot, now) };
  }, [snapshot]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    setInput("");
    void companion.send(text);
  };

  const shown = messages.length === 0 ? [WELCOME] : messages;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở Vẹt Vàng"
          data-testid="companion-launcher"
          className="fixed bottom-4 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-amber-500 pl-3 pr-5 text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600 md:bottom-6 md:right-6"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-xl" aria-hidden>🦜</span>
          <span className="text-sm font-bold">Ghi chi tiêu</span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} aria-hidden />
          <section
            role="dialog"
            aria-label="Vẹt Vàng"
            data-testid="companion-panel"
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl",
              "inset-x-0 bottom-0 h-[85dvh] rounded-t-3xl",
              "md:inset-x-auto md:bottom-6 md:right-6 md:h-[min(680px,calc(100dvh-6rem))] md:w-[400px] md:rounded-3xl",
            )}
          >
            <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-2xl" aria-hidden>🦜</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">Vẹt Vàng</p>
                <p className="truncate text-[11px] text-slate-500" data-testid="companion-status">
                  Hôm nay chi {formatVndShort(status.day.spent)}
                  {status.budget.remaining !== null && ` · Ngân sách còn ${formatVndShort(status.budget.remaining)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={companion.clearHistory}
                aria-label="Xóa lịch sử trò chuyện"
                title="Xóa lịch sử trò chuyện (không xóa giao dịch)"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" data-testid="companion-messages">
              {shown.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[88%]", m.role === "user" ? "" : "w-full")}>
                    <div
                      className={cn(
                        "whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        m.role === "user" ? "rounded-br-md bg-slate-900 text-white" : "rounded-bl-md bg-slate-100 text-slate-800",
                      )}
                    >
                      {m.text}
                    </div>
                    {m.note && <p className="mt-1 px-1 text-[11px] text-slate-500">{m.note}</p>}
                    {m.proposal && (
                      <ProposalCard
                        message={m}
                        snapshot={snapshot}
                        onConfirm={companion.confirm}
                        onCancel={companion.cancel}
                        onRetry={companion.retry}
                        onEdit={companion.editDraft}
                        onRemove={companion.removeDraft}
                      />
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Vẹt Vàng đang đọc câu của bạn…
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
              <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => submit(q)}
                    disabled={busy}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={500}
                  placeholder="VD: ăn phở 35k, grab 40k"
                  aria-label="Tin nhắn cho Vẹt Vàng"
                  data-testid="companion-input"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[16px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:bg-white md:text-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || busy}
                  aria-label="Gửi"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
                </button>
              </form>
            </div>
          </section>
        </>
      )}
    </>
  );
}

