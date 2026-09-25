"use client";

import { Check, Loader2, Trash2, X } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryEmoji } from "@/lib/companion/categories";
import { parseAmount } from "@/lib/companion/amount";
import { formatVnd } from "@/lib/companion/engine";
import type { FinanceSnapshot } from "@/lib/companion/finance-snapshot";
import { cn } from "@/lib/utils";
import type { ChatMessage, EditableDraft } from "./useCompanion";

interface Props {
  message: ChatMessage;
  snapshot: FinanceSnapshot;
  onConfirm: (m: ChatMessage) => void;
  onCancel: (m: ChatMessage) => void;
  onRetry: (m: ChatMessage) => void;
  onEdit: (messageId: string, draftId: string, update: Partial<EditableDraft>) => void;
  onRemove: (messageId: string, draftId: string) => void;
}

function formatDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

function DraftRow({ draft, editable, snapshot, onEdit, onRemove }: {
  draft: EditableDraft;
  editable: boolean;
  snapshot: FinanceSnapshot;
  onEdit: (update: Partial<EditableDraft>) => void;
  onRemove: () => void;
}) {
  const categories = draft.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const sign = draft.type === "income" ? "+" : "-";

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-2.5" data-testid="draft-row">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-6" aria-hidden>{categoryEmoji(draft.category, draft.type)}</span>
        <div className="min-w-0 flex-1">
          {editable ? (
            <input
              aria-label="Mô tả"
              value={draft.note}
              maxLength={80}
              onChange={(e) => onEdit({ note: e.target.value })}
              className="w-full truncate bg-transparent text-sm font-semibold text-slate-900 outline-none focus:underline"
            />
          ) : (
            <p className="truncate text-sm font-semibold text-slate-900">{draft.note}</p>
          )}
          <p className="text-[11px] text-slate-500">
            {draft.type === "income" ? "Thu" : "Chi"} · {formatDay(draft.date)}
          </p>
        </div>
        {editable ? (
          <input
            aria-label="Số tiền"
            inputMode="numeric"
            defaultValue={draft.amount.toLocaleString("vi-VN")}
            onBlur={(e) => {
              const typed = e.target.value.trim();
              const digitsOnly = typed.replace(/[.,\s]/g, "");
              // "35000" / "35.000" as typed; anything shorter or with units ("35", "35k", "1tr2") goes through the chat parser
              const value = /^\d+$/.test(digitsOnly) && parseInt(digitsOnly, 10) >= 500 ? parseInt(digitsOnly, 10) : parseAmount(typed);
              if (value && value > 0) onEdit({ amount: value });
              e.target.value = (value && value > 0 ? value : draft.amount).toLocaleString("vi-VN");
            }}
            className={cn(
              "w-28 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-sm font-bold tabular-nums outline-none focus:border-amber-400",
              draft.type === "income" ? "text-emerald-700" : "text-slate-900",
            )}
          />
        ) : (
          <span className={cn("shrink-0 font-mono text-sm font-bold tabular-nums", draft.type === "income" ? "text-emerald-700" : "text-slate-900")}>
            {sign}{formatVnd(draft.amount)}
          </span>
        )}
        {editable && (
          <button type="button" onClick={onRemove} aria-label="Bỏ khoản này" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editable && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <select
            aria-label="Danh mục"
            value={draft.category}
            onChange={(e) => onEdit({ category: e.target.value })}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
          >
            {categories.map((c) => (
              <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
            ))}
          </select>
          {draft.type === "expense" && snapshot.pots.length > 0 && (
            <select
              aria-label="Hũ ngân sách"
              value={draft.potId ?? ""}
              onChange={(e) => onEdit({ potId: e.target.value || null })}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              <option value="">Không gắn hũ</option>
              {snapshot.pots.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {editable && draft.assumptions.length > 0 && (
        <p className="mt-1.5 text-[11px] text-amber-700">⚠ {draft.assumptions.join(" · ")}</p>
      )}
    </li>
  );
}

export default function ProposalCard({ message, snapshot, onConfirm, onCancel, onRetry, onEdit, onRemove }: Props) {
  const p = message.proposal;
  if (!p) return null;
  const state = message.proposalState ?? "open";
  const open = state === "open";

  return (
    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-2.5" data-testid="proposal-card" data-state={state}>
      {p.kind === "create" && (
        <ul className="space-y-2">
          {(message.drafts ?? []).map((d) => (
            <DraftRow
              key={d.id}
              draft={d}
              editable={open}
              snapshot={snapshot}
              onEdit={(u) => onEdit(message.id, d.id, u)}
              onRemove={() => onRemove(message.id, d.id)}
            />
          ))}
        </ul>
      )}

      {p.kind !== "create" && (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-sm">
          <p className="font-semibold text-slate-900">{p.entry.note || p.entry.category}</p>
          <p className="text-xs text-slate-500">
            {formatDay(p.entry.date)} · {formatVnd(p.entry.amount)}
            {p.kind === "update" && <> → <b className="text-slate-900">{formatVnd(p.patch.amount)}</b></>}
          </p>
        </div>
      )}

      {message.outcome && (
        <p
          role="status"
          className={cn(
            "mt-2 text-xs font-medium",
            state === "done" ? "text-emerald-700" : state === "error" ? "text-rose-700" : "text-slate-500",
          )}
        >
          {message.outcome}
        </p>
      )}

      {(open || state === "saving") && (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm(message)}
            disabled={!open || (p.kind === "create" && (message.drafts ?? []).length === 0)}
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {p.kind === "create" ? "Lưu" : p.kind === "delete" ? "Xóa" : "Sửa"}
          </button>
          <button
            type="button"
            onClick={() => onCancel(message)}
            disabled={!open}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" /> Hủy
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => onRetry(message)} className="min-h-10 flex-1 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white">
            Thử lại
          </button>
          <button type="button" onClick={() => onCancel(message)} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
