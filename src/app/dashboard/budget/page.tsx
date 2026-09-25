"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Coffee, ShoppingBag, Car, Home, Gamepad2, Heart,
  GraduationCap, TrendingUp, Trash2, X, Check, Edit3, AlertTriangle, Download,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { addXP } from "@/lib/gamification";
import { getCachedUserId, saveBudgetPots, saveIncome as saveIncomeRemote } from "@/lib/supabase/user-data";
import type { BudgetPot, Expense } from "@/lib/types/budget";
import { getBudgetPots, setBudgetPots, getExpenses, setExpenses as setExpensesLocal, getIncome, setIncome as setIncomeLocal } from "@/lib/storage";
import { commitTransactions, onFinanceChanged } from "@/lib/stores/transaction-store";
import { newId, toLocalDateKey } from "@/lib/companion/transaction-parser";
import { cn, formatNumber, parseNumber } from "@/lib/utils";

/* ─── Local alias — budget page uses "Pot" internally ─── */
type Pot = BudgetPot;
const getExpensePotId = (expense: Expense) => expense.potId ?? expense.pot_id ?? "";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  Coffee, ShoppingBag, Car, Home, Gamepad2, Heart, GraduationCap, TrendingUp, Wallet,
};

const ICON_OPTIONS = [
  { key: "Coffee", label: "☕", comp: Coffee },
  { key: "ShoppingBag", label: "🛍️", comp: ShoppingBag },
  { key: "Car", label: "🚗", comp: Car },
  { key: "Home", label: "🏠", comp: Home },
  { key: "Gamepad2", label: "🎮", comp: Gamepad2 },
  { key: "Heart", label: "❤️", comp: Heart },
  { key: "GraduationCap", label: "🎓", comp: GraduationCap },
  { key: "TrendingUp", label: "📈", comp: TrendingUp },
  { key: "Wallet", label: "💰", comp: Wallet },
];

const COLOR_OPTIONS = ["#22C55E", "#00E5FF", "#6366F1", "#AB47BC", "#FF6B35", "#EF4444", "#FFD700", "#FF69B4"];

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}tr`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatFull(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

/* ─── CyberCard Component ─── */
function CyberCard({ children, className, glowColor = "rgba(34,197,94,0.08)" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  return (
    <div className={cn("group relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/30", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)] z-0" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:32px_32px] z-0" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: `radial-gradient(circle at 50% 35%, ${glowColor}, transparent 46%)` }}
      />

      {/* Corner Decorators */}
      <div className="pointer-events-none absolute right-4 top-4 h-6 w-6 border-r border-t border-white/15 transition-all group-hover:border-[#22C55E]/40" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 border-b border-l border-white/10 transition-all group-hover:border-[#22C55E]/20" />

      <div className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
        {children}
      </div>
    </div>
  );
}

/* ─── Add Pot Modal ─── */
function AddPotModal({ onClose, onAdd }: { onClose: () => void; onAdd: (pot: Pot) => void }) {
  const [name, setName] = useState("");
  const [allocatedDisplay, setAllocatedDisplay] = useState("");
  const [iconKey, setIconKey] = useState("Wallet");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const handleSubmit = () => {
    if (!name.trim() || !allocatedDisplay) return;
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      iconKey,
      allocated: parseNumber(allocatedDisplay),
      color,
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#040807]/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#08110f] p-5 sm:p-8 w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.15),transparent_50%)]" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-heading text-[20px] font-black uppercase tracking-wider text-white">Thêm hũ mới</h3>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white/60 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60 block mb-2">Tên hũ</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Quỹ dự phòng"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-[#22C55E]/40 transition-all font-semibold" />
            </div>
            <div>
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60 block mb-2">Ngân sách (VND)</label>
              <input type="text" value={allocatedDisplay} onChange={(e) => setAllocatedDisplay(formatNumber(e.target.value))} placeholder="1,000,000"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-[#22C55E]/40 transition-all font-heading font-black" />
            </div>
            <div>
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60 block mb-3">Biểu tượng</label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => setIconKey(opt.key)}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all text-xl ${iconKey === opt.key ? "bg-[#22C55E]/20 border border-[#22C55E]/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "bg-white/[0.03] border border-white/[0.06] hover:border-white/20"
                      }`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60 block mb-3">Màu sắc định danh</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all border-2 ${color === c ? "scale-110 border-white ring-4 ring-white/10" : "border-transparent opacity-60 hover:opacity-100"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!name.trim() || !allocatedDisplay}
              className="group relative w-full py-4 bg-[#22C55E] text-black font-heading text-[14px] font-black uppercase tracking-widest rounded-xl disabled:opacity-30 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all overflow-hidden mt-4">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center justify-center gap-2"><Check className="w-5 h-5" /> TẠO HŨ NGAY</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Log Expense Modal ─── */
function LogExpenseModal({ pot, onClose, onLog }: { pot: Pot; onClose: () => void; onLog: (expense: Expense) => void }) {
  const [amountDisplay, setAmountDisplay] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!amountDisplay) return;
    onLog({
      id: newId(),
      potId: pot.id,
      amount: parseNumber(amountDisplay),
      note: note.trim() || "Chi tiêu",
      date: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#040807]/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#08110f] p-5 sm:p-8 w-full max-w-sm shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40 transition-opacity duration-700"
          style={{ background: `radial-gradient(circle at 50% 0%, ${pot.color}, transparent 60%)` }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 shadow-inner" style={{ backgroundColor: `${pot.color}20` }}>
              {(() => { const IC = ICON_MAP[pot.iconKey] || Wallet; return <IC className="w-6 h-6" color={pot.color} />; })()}
            </div>
            <div>
              <h3 className="font-heading text-[18px] font-black uppercase text-white leading-tight">{pot.name}</h3>
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/30">Ghi nhận chi tiêu</p>
            </div>
            <button onClick={onClose} className="ml-auto p-2 text-white/30 hover:text-white/60"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60 block mb-2">Số tiền (VND)</label>
              <input type="text" value={amountDisplay} onChange={(e) => setAmountDisplay(formatNumber(e.target.value))} placeholder="50,000" autoFocus
                className="w-full px-4 py-4 bg-white/[0.03] border border-white/[0.1] rounded-xl text-3xl font-heading font-black text-white placeholder:text-white/10 focus:outline-none focus:border-[#22C55E]/40" />
            </div>

            <div className="flex flex-wrap gap-2">
              {[50000, 100000, 200000, 500000].map((v) => (
                <button key={v} onClick={() => setAmountDisplay(formatNumber(v))}
                  className={`flex-1 px-3 py-2.5 font-mono text-[10px] font-black uppercase rounded-lg border transition-all ${amountDisplay === formatNumber(v) ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30" : "bg-white/[0.03] text-white/30 border-white/[0.06] hover:border-white/20"
                    }`}>
                  {v >= 1000000 ? `${v / 1000000}tr` : `${v / 1000}K`}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60 block mb-2">Ghi chú hành vi</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Món quà cho bản thân"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl text-sm font-semibold text-white placeholder:text-white/10 focus:outline-none focus:border-[#22C55E]/40" />
            </div>

            <button onClick={handleSubmit} disabled={!amountDisplay}
              className="group relative w-full py-4 text-black font-heading text-[14px] font-black uppercase tracking-widest rounded-xl disabled:opacity-30 hover:shadow-[0_0_30px_rgba(0,0,0,0.4)] transition-all overflow-hidden mt-4"
              style={{ backgroundColor: pot.color }}>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> XÁC NHẬN CHI</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function BudgetPage() {
  const [pots, setPots] = useState<Pot[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState(0);
  const [showAddPot, setShowAddPot] = useState(false);
  const [logPot, setLogPot] = useState<Pot | null>(null);
  const [editIncome, setEditIncome] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const reload = useCallback(() => {
    setPots(getBudgetPots());
    setExpenses(getExpenses());
    setIncome(getIncome());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      reload();
      if (getIncome() <= 0) setEditIncome(true);
    }, 0);
    // Vẹt Vàng and the ledger write through the transaction store; refresh when they do.
    const unsubscribe = onFinanceChanged(reload);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [reload]);

  // Pots and income are budget settings; transactions only go through the transaction store,
  // so a stale `expenses` array here can never overwrite what another view just saved.
  const savePots = useCallback((p: Pot[]) => {
    setBudgetPots(p);
    if (getCachedUserId()) saveBudgetPots(p).catch(() => { });
  }, []);

  const addPot = (pot: Pot) => {
    const newPots = [...pots, pot];
    setPots(newPots);
    savePots(newPots);
    addXP("setup_budget");
  };

  const removePot = (id: string) => {
    const newPots = pots.filter((p) => p.id !== id);
    setPots(newPots);
    savePots(newPots);
    // Keep the money history: the pot's transactions become unassigned instead of deleted.
    setExpensesLocal(getExpenses().map((e) => (getExpensePotId(e) === id ? { ...e, potId: "", pot_id: null } : e)));
    setExpenses(getExpenses());
  };

  const logExpense = (expense: Expense) => {
    const pot = pots.find(p => p.id === getExpensePotId(expense));
    try {
      commitTransactions([{
        id: expense.id,
        type: "expense",
        amount: expense.amount,
        category: pot?.name || "Khác",
        note: expense.note || "",
        date: toLocalDateKey(new Date(expense.date)),
        potId: getExpensePotId(expense) || null,
      }]);
      addXP("log_expense");
    } catch (err) {
      window.alert(`Chưa lưu được khoản chi: ${err instanceof Error ? err.message : "lỗi không xác định"}`);
    }
    reload();
  };

  const updateIncome = (val: number) => {
    setIncome(val);
    setIncomeLocal(val);
    if (getCachedUserId()) saveIncomeRemote(val).catch(() => { });
    setEditIncome(false);
  };

  const exportCSV = () => {
    const header = "Ngày,Hũ,Số tiền,Ghi chú\n";
    const rows = expenses.map(e => {
      const pot = pots.find(p => p.id === getExpensePotId(e));
      return `${new Date(e.date).toLocaleDateString("vi-VN")},${pot?.name || "Khác"},${e.amount},"${e.note}"`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vietfi_chitieu_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Budgets are monthly: only this month's spending counts against pots and income.
  const thisMonth = toLocalDateKey(new Date()).slice(0, 7);
  const monthExpenses = expenses.filter((e) => toLocalDateKey(new Date(e.date)).slice(0, 7) === thisMonth);
  const getSpent = (potId: string) => monthExpenses.filter((e) => getExpensePotId(e) === potId).reduce((s, e) => s + e.amount, 0);
  const totalAllocated = pots.reduce((s, p) => s + p.allocated, 0);
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = income - totalSpent;
  const allocationRate = income > 0 ? Math.round((totalAllocated / income) * 100) : 0;

  const pieData = pots.map((p) => {
    const spent = getSpent(p.id);
    return { name: p.name, value: totalSpent === 0 ? p.allocated : spent, color: p.color };
  });
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      {/* Header Area */}
      <motion.div variants={fadeIn} className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div>
            <h2 className="font-heading text-[24px] md:text-[32px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)]">
              Quản lý Ngân sách
            </h2>
            <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#22C55E]/60">
              Công nghệ hóa phân bổ tài chính cá nhân
            </p>
          </div>
          <div className="flex items-center gap-3">
            {expenses.length > 0 && (
              <button onClick={exportCSV}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border border-white/5 text-white/40 font-mono text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:text-white transition-all hover:border-white/20">
                <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" /> Xuất dữ liệu
              </button>
            )}
            <button onClick={() => setIsDeleteMode(!isDeleteMode)}
              className={cn(
                "group relative flex items-center gap-2 px-6 py-2.5 font-heading text-[12px] font-black uppercase tracking-widest rounded-lg transition-all overflow-hidden",
                isDeleteMode
                  ? "bg-[#EF4444] text-black shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  : "bg-white/[0.05] border border-white/10 text-white/50 hover:bg-[#EF4444] hover:text-black hover:border-transparent"
              )}>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Trash2 className="relative z-10 w-4 h-4" />
              <span className="relative z-10">{isDeleteMode ? "HỦY XÓA" : "XÓA HŨ"}</span>
            </button>
            <button onClick={() => setShowAddPot(true)}
              className="group relative flex items-center gap-2 px-6 py-2.5 bg-[#22C55E] text-black font-heading text-[12px] font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all overflow-hidden text-center">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Plus className="relative z-10 w-4 h-4" />
              <span className="relative z-10">Tạo hũ mới</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Summary Matrix */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <CyberCard className="hover:border-[#22C55E]/40" glowColor="rgba(34,197,94,0.12)">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#22C55E]/60">Tổng Thu nhập</span>
            <button onClick={() => setEditIncome(true)} className="p-1 hover:text-[#22C55E] transition-colors"><Edit3 className="w-3.5 h-3.5 opacity-20 group-hover:opacity-100" /></button>
          </div>
          {editIncome ? (
            <input type="text" autoFocus value={formatNumber(income)} onChange={(e) => setIncome(parseNumber(e.target.value))}
              onBlur={() => updateIncome(income)} onKeyDown={(e) => e.key === "Enter" && updateIncome(income)}
              className="w-full font-heading text-[24px] md:text-[32px] font-black tracking-tighter bg-transparent text-[#22C55E] border-b border-[#22C55E]/30 outline-none" />
          ) : (
            <div className="font-heading text-[24px] md:text-[32px] font-black tracking-tighter text-white">{formatVND(income)}</div>
          )}
        </CyberCard>

        <CyberCard glowColor="rgba(239,68,68,0.1)">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/30 block mb-3">Thực chi</span>
          <div className={cn(
            "font-heading text-[24px] md:text-[32px] font-black tracking-tighter",
            totalSpent > income * 0.8 ? "text-[#EF4444]" : "text-white"
          )}>{formatVND(totalSpent)}</div>
        </CyberCard>

        <CyberCard glowColor="rgba(34,197,94,0.1)">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/30 block mb-3">Số dư khả dụng</span>
          <div className={cn(
            "font-heading text-[24px] md:text-[32px] font-black tracking-tighter",
            remaining > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
          )}>{formatVND(remaining)}</div>
        </CyberCard>

        <CyberCard glowColor="rgba(0,229,255,0.1)">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/30 block mb-3">Tỷ lệ phân bổ</span>
          <div className="font-heading text-[24px] md:text-[32px] font-black tracking-tighter text-[#00E5FF]">
            {allocationRate}%
          </div>
        </CyberCard>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Analysis Panel */}
        <motion.div variants={fadeIn} className="lg:col-span-1">
          <CyberCard className="h-full" glowColor="rgba(255,255,255,0.05)">
            <h3 className="font-heading text-[15px] font-black uppercase tracking-wider text-white mb-6">Cơ cấu Ngân sách</h3>

            <div className="w-full min-w-0 h-64 -mt-2 relative flex items-center justify-center">
              {/* Center Label Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 pt-4">
                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/20">
                  {totalSpent === 0 ? "NGÂN SÁCH" : "ĐÃ CHI"}
                </span>
                <span className={cn(
                  "font-heading text-[20px] font-black tracking-tighter mt-1",
                  totalSpent === 0 ? "text-white/40" : "text-[#22C55E]"
                )}>
                  {formatVND(totalSpent === 0 ? totalAllocated : totalSpent)}
                </span>
                {totalSpent > 0 && (
                  <span className="text-[9px] font-mono font-black text-white/20 mt-1 uppercase tracking-widest">
                    {Math.round((totalSpent / totalAllocated) * 100)}% Phân bổ
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      background: "#08110f",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      padding: "8px 12px",
                      color: "#FFF",
                      fontSize: 11,
                      fontVariantNumeric: "slashed-zero"
                    }}
                    formatter={(value, name) => [formatFull(Number(value ?? 0)), name]}
                  />
                  <Pie
                    data={pots.length === 0 ? [{ name: "Trống", value: 1, color: "rgba(255,255,255,0.05)" }] : pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={pots.length > 1 ? 4 : 0}
                    dataKey="value"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={1200}
                  >
                    {(pots.length === 0 ? [{ name: "Trống", value: 1, color: "rgba(255,255,255,0.05)" }] : pieData).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={totalSpent === 0 && pots.length > 0 ? "rgba(255,255,255,0.05)" : entry.color}
                        fillOpacity={totalSpent === 0 ? 0.3 : 0.8}
                        className="transition-all duration-500"
                        style={{
                          filter: totalSpent > 0 && entry.value === 0 ? "grayscale(1)" : "none",
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Matrix */}
            {recentExpenses.length > 0 && (
              <div className="mt-6 border-t border-white/5 pt-6">
                <h4 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/20 mb-4">GIAO DỊCH GẦN ĐÂY</h4>
                <div className="space-y-3">
                  {recentExpenses.map((exp) => {
                    const pot = pots.find((p) => p.id === getExpensePotId(exp));
                    return (
                      <div key={exp.id} className="group/item flex items-center justify-between border-b border-white/[0.03] pb-2 last:border-0 hover:bg-white/[0.02] transition-colors rounded-sm px-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0 group-hover/item:scale-125 transition-transform" style={{ backgroundColor: pot?.color || "#888" }} />
                          <span className="font-mono text-[11px] text-white/40 truncate uppercase">{exp.note}</span>
                        </div>
                        <span className="font-heading text-[12px] font-black text-white/60">-{formatVND(exp.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CyberCard>
        </motion.div>

        {/* Pots Management */}
        <motion.div variants={stagger} className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          {pots.map((pot) => {
            const spent = getSpent(pot.id);
            const percent = pot.allocated > 0 ? Math.round((spent / pot.allocated) * 100) : 0;
            const overBudget = spent > pot.allocated;
            const nearLimit = percent >= 80 && !overBudget;
            const Icon = ICON_MAP[pot.iconKey] || Wallet;

            return (
              <CyberCard key={pot.id} className={cn("cursor-pointer group relative transition-all duration-300", isDeleteMode && "scale-[0.98] blur-[0.5px] grayscale-[0.5]")} glowColor={`${pot.color}20`}>
                {isDeleteMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePot(pot.id); }}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] z-50 flex items-center justify-center animate-bounce hover:scale-110 transition-transform sm:-top-2 sm:-right-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div onClick={() => !isDeleteMode && setLogPot(pot)} className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Icon className="w-5 h-5" color={pot.color} />
                      </div>
                      <div>
                        <h4 className="font-heading text-[16px] font-black uppercase text-white truncate max-w-[120px]">{pot.name}</h4>
                        <div className="font-mono text-[9px] font-black uppercase tracking-wider text-white/30 flex items-center gap-2">
                          <span>{formatVND(spent)}</span>
                          <span className="text-white/10">/</span>
                          <span>{formatVND(pot.allocated)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`font-heading text-[20px] font-black tracking-tighter ${overBudget ? "text-[#EF4444]" : nearLimit ? "text-[#FFD700]" : "text-[#22C55E]"}`}>
                      {percent}%
                    </div>
                  </div>

                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percent, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ backgroundColor: overBudget ? "#EF4444" : nearLimit ? "#FFD700" : pot.color }}
                    />
                  </div>

                  {overBudget ? (
                    <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#EF4444] bg-[#EF4444]/10 py-1 px-2 rounded-md flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> VƯỢT NGÂN SÁCH {formatVND(spent - pot.allocated)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between font-mono text-[9px] font-black uppercase tracking-widest text-white/15 group-hover:text-white/30 transition-colors">
                      <span>PHÂN BỔ TỐI ƯU</span>
                      <span>ACTIVE_LINK</span>
                    </div>
                  )}
                </div>
              </CyberCard>
            );
          })}

          {/* Create New Pot Trigger */}
          <button
            onClick={() => setShowAddPot(true)}
            className="group relative h-full min-h-[140px] rounded-xl border-2 border-dashed border-white/10 bg-transparent hover:border-[#22C55E]/40 hover:bg-[#22C55E]/5 transition-all flex flex-col items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.05),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-[#22C55E]/30 transition-all">
              <Plus className="w-6 h-6 text-white/20 group-hover:text-[#22C55E]" />
            </div>
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/60">Kiểm soát dòng tiền mới</span>
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAddPot && <AddPotModal onClose={() => setShowAddPot(false)} onAdd={addPot} />}
        {logPot && <LogExpenseModal pot={logPot} onClose={() => setLogPot(null)} onLog={logExpense} />}
      </AnimatePresence>
    </motion.div>
  );
}


