"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { NewsArticle, NewsSentimentLabel } from "@/lib/news/crawler";
import dynamic from "next/dynamic";
import { isFirstTimeUser, getOnboardingData } from "@/lib/onboarding-state";
import { cn } from "@/lib/utils";
import { FINANCE_CHANGED_EVENT } from "@/lib/stores/transaction-store";
import { getBudgetPots, getExpenses, getIncome, getRiskResult, getMarketCache, getLedgerEntries } from "@/lib/storage";
import { BASE_ALLOCATIONS, adjustAllocation, type AllocationItem } from "@/lib/constants/allocations";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Clock,
  Calendar,
  Wallet,
  PencilLine,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  X,
} from "lucide-react";
import Link from "next/link";

const QuickSetupWizard = dynamic(() => import("@/components/onboarding/QuickSetupWizard"), { ssr: false });

import { BadgeGrid } from "@/components/gamification/Badges";

import { MarketSection } from "./components/MarketSection";
import { DailyQuestSection } from "./components/DailyQuestSection";
import { NotificationBanner } from "./components/NotificationBanner";

// Moved portfolioData calculation into the component using useMemo

interface BriefData {
  date: string;
  title: string;
  summary: string;
  raw?: string;
  takeaways: { emoji: string; asset: string; text: string }[];
  source?: "gemini" | "heuristic";
  stale?: boolean;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: NewsSentimentLabel;
  category?: string;
}

// Removed manual client-side brief generation to avoid stale/incorrect mock data.

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "vừa xong";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const FALLBACK_NEWS: NewsItem[] = [
  { title: "Đang tải tin tức...", source: "VietFi", time: "", sentiment: "neutral" },
];

const sentimentTag = {
  bullish: { color: "#22C55E", label: "Tích cực" },
  bearish: { color: "#EF4444", label: "Tiêu cực" },
  neutral: { color: "#8B8D96", label: "Trung lập" },
};

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
/* ─── Animated Counter (Wealthsimple-style) ─── */
function AnimatedCounter({ target, prefix = "", suffix = "", duration = 1.8 }: {
  target: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const steps = duration * 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(current));
          }, 16);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString("vi-VN")}{suffix}
    </span>
  );
}

function NetWorthCard({
  netWorthMillions,
  monthlyDeltaPct,
  mounted,
  chartData = [],
}: {
  netWorthMillions: number | null;
  monthlyDeltaPct: number;
  mounted: boolean;
  chartData?: { m: string, v: number, amount: string, isCurrent?: boolean, isEmpty?: boolean }[];
}) {

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-[#08110f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/20 group flex flex-col">
      {/* Cyber-Technical Background Elements */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.08),transparent_46%)] opacity-80" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-white/20" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-white/10" />

      <div className="relative z-10 mb-4 border-b border-white/[0.06] pb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-2 sm:px-6">
        <div className="relative flex flex-col items-start pt-2">
          <div className="w-full text-left">
            <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px]">
              TỔNG TÀI SẢN RÒNG
            </h3>
            <p className="mt-3 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-[#22C55E]/90">
              PHÂN TÍCH TÀI SẢN RÒNG
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 pt-2">
          <p className="font-mono text-[12px] font-black tracking-widest text-white/75">
            {mounted ? new Date().toLocaleDateString("vi-VN").toUpperCase() : "--/--/----"}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col lg:flex-row items-center gap-8 px-2 sm:px-6 mb-4">
        {/* Left column: Metrics */}
        <div className="flex flex-col items-start min-w-[200px]">
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-[48px] sm:text-[64px] font-black text-white leading-none tracking-tighter">
              {netWorthMillions !== null ? (
                <AnimatedCounter target={netWorthMillions >= 1000 ? netWorthMillions / 1000 : netWorthMillions} />
              ) : (
                <span className="text-white/40">—</span>
              )}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-[20px] sm:text-[24px] text-white/80 font-black uppercase tracking-tight leading-none">
                {netWorthMillions && netWorthMillions >= 1000 ? "TỶ" : "TRIỆU"}
              </span>
              <span className="font-heading text-[16px] sm:text-[20px] text-white/50 font-black tracking-widest leading-none">VND</span>
            </div>
          </div>

          <div className={cn(
            "mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[12px] font-black uppercase tracking-wider",
            monthlyDeltaPct > 0 ? "bg-[#22C55E]/5 border-[#22C55E]/20 text-[#22C55E]" :
              monthlyDeltaPct < 0 ? "bg-[#EF4444]/5 border-[#EF4444]/20 text-[#EF4444]" :
                "bg-white/5 border-white/10 text-white/40"
          )}>
            {monthlyDeltaPct > 0 ? `Tăng ${monthlyDeltaPct}% tháng này` :
              monthlyDeltaPct < 0 ? `Giảm ${Math.abs(monthlyDeltaPct)}% tháng này` :
                "Không thay đổi"}
          </div>
        </div>

        {/* Right column: Chart section */}
        <div className="flex-1 w-full flex flex-col justify-end h-full pt-4">
          <div className="flex items-end gap-3 h-[130px] w-full">
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 group/bar h-full">
                <div className="relative w-full h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.v}%` }}
                    transition={{ duration: 1.2, delay: i * 0.1, ease: "circOut" }}
                    className={cn(
                      "w-full rounded-t-md relative transition-all duration-500",
                      d.isEmpty
                        ? "bg-white/5 border border-dashed border-white/10 opacity-50"
                        : d.isCurrent
                          ? "bg-gradient-to-t from-[#22C55E]/40 to-[#22C55E] shadow-[0_0_24px_rgba(34,197,94,0.3)]"
                          : "bg-white/10"
                    )}
                  >
                    {!d.isEmpty && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 bg-black/90 border border-white/10 px-2.5 py-1 rounded shadow-xl text-[10px] text-white font-mono whitespace-nowrap z-20">
                        {d.amount}
                      </div>
                    )}
                  </motion.div>
                </div>
                <span className="mt-3 font-mono text-[12px] font-black text-white/80 uppercase tracking-widest">{d.m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* INLINE COMPONENTS */

function PortfolioMini({ allocation }: { allocation: AllocationItem[] }) {
  const radius = 96;
  const strokeWidth = 38;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const chartSegments = useMemo(
    () =>
      allocation.reduce<{
        item: AllocationItem;
        segmentLength: number;
        rotation: number;
        labelX: number;
        labelY: number;
      }[]>((segments, item) => {
        const cumulative = segments.reduce((total, segment) => total + segment.item.percent, 0);
        const mid = cumulative + item.percent / 2;
        const angle = (mid / 100) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const labelDist = radius + 10;

        return [
          ...segments,
          {
            item,
            segmentLength: (item.percent / 100) * circumference,
            rotation: (cumulative / 100) * 360,
            labelX: radius + Math.cos(rad) * labelDist,
            labelY: radius + Math.sin(rad) * labelDist,
          },
        ];
      }, []),
    [allocation, circumference]
  );

  return (
    <motion.div
      variants={fadeIn}
      className="group relative h-full overflow-hidden rounded-xl border border-[#22C55E]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/40 md:p-8"
    >
      {/* Cyber-Technical Background Elements */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.18),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(0,229,255,0.08),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Corner Decor */}
      <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[#22C55E]/35" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#22C55E]/20" />

      <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6 max-w-full">
        <div className="relative flex flex-col items-start px-2 sm:px-6 pt-2">
          <div className="w-full text-left">
            <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px]">
              PHÂN BỔ DANH MỤC
            </h3>
            <p className="mt-4 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-white/70">
              Gợi ý phân bổ tài sản
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex aspect-square w-full max-w-[260px] items-center justify-center sm:max-w-[280px]">
          <div className="pointer-events-none absolute inset-[6%] rounded-full bg-[#22C55E]/8 blur-[42px]" />
          <div className="pointer-events-none absolute inset-[17%] rounded-full border border-white/[0.035]" />

          <svg
            height="100%"
            width="100%"
            viewBox={`0 0 ${radius * 2} ${radius * 2}`}
            className="rotate-[-90deg] drop-shadow-[0_18px_34px_rgba(0,0,0,0.56)]"
          >
            <circle
              stroke="rgba(255,255,255,0.04)"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {chartSegments.map(({ item, segmentLength, rotation }) => {
              return (
                <circle
                  key={item.asset}
                  stroke={item.color}
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segmentLength} ${circumference}`}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    filter: `drop-shadow(0 0 8px ${item.color}33)`
                  }}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
              );
            })}
          </svg>

          <div className="absolute inset-[28%] flex flex-col items-center justify-center rounded-full border border-white/[0.06] bg-[#070a14] shadow-[inset_0_0_26px_rgba(0,0,0,0.9),0_0_42px_rgba(34,197,94,0.12)]">
            <div className="mb-2 h-2 w-2 animate-pulse rounded-full bg-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.9)]" />
            <span className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/80">Trạng thái</span>
            <span className="mt-1.5 font-mono text-[14px] font-black uppercase tracking-[0.14em] text-white/95">Tối ưu</span>
          </div>

          {chartSegments.map(({ item, labelX, labelY }) => (
            <span
              key={`label-${item.asset}`}
              className="absolute font-mono text-[14px] font-black tracking-tighter text-white/90"
              style={{
                left: `${((labelX / (radius * 2)) * 100).toFixed(5)}%`,
                top: `${((labelY / (radius * 2)) * 100).toFixed(5)}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {item.percent}%
            </span>
          ))}
        </div>

        <div className="mt-7 flex w-full flex-col gap-2 sm:mt-8">
          {allocation.map((item) => (
            <div
              key={item.asset}
              className="group/item flex items-center justify-between gap-4 rounded-md px-2 py-2.5 transition-colors hover:bg-white/[0.035]"
            >
              <div className="flex min-w-0 items-center gap-4 flex-1">
                <div className="relative">
                  <div
                    className="absolute inset-0 blur-[7px] opacity-55 transition-opacity group-hover/item:opacity-90"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className="relative block h-3.5 w-3.5 shrink-0 rounded-[3px] border border-white/20"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
                <span className="min-w-0 whitespace-nowrap font-heading text-[15px] font-black uppercase tracking-wide text-white/90 transition-colors group-hover/item:text-white">
                  {item.asset}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="h-px w-10 bg-white/10 transition-colors group-hover/item:bg-[#22C55E]/35 sm:w-16" />
                <span className="min-w-9 text-right font-mono text-[13px] font-black text-white/80 transition-colors group-hover/item:text-[#22C55E]">
                  {item.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
type BriefTakeaway = BriefData["takeaways"][number];

function buildFallbackBriefTakeaways(brief: BriefData): BriefTakeaway[] {
  const summarySnippet = brief.summary;

  return [
    {
      emoji: "📈",
      asset: "Thanh khoản",
      text: `Dòng tiền vẫn là chìa khóa. ${summarySnippet}`,
    },
    {
      emoji: "🏦",
      asset: "Ngân hàng",
      text: "Nhóm ngân hàng thường dẫn nhịp khi thị trường muốn hồi bền hơn, nên đây là lớp cần theo dõi kỹ nhất.",
    },
    {
      emoji: "🧭",
      asset: "Định giá",
      text: "Nếu định giá chưa quá căng và tin tức không xấu thêm, thị trường vẫn còn cửa tích lũy theo lớp.",
    },
  ];
}

function padTakeaways(items: BriefTakeaway[], fallbacks: BriefTakeaway[], limit: number) {
  const result = [...items];
  for (const fallback of fallbacks) {
    if (result.length >= limit) break;
    if (!result.some((item) => item.asset === fallback.asset)) {
      result.push(fallback);
    }
  }
  return result.slice(0, limit);
}

function BriefCard({ brief, loading }: { brief: BriefData | null; loading: boolean }) {
  if (loading || !brief) {
    return (
      <motion.div
        variants={fadeIn}
        className="col-span-full space-y-4 animate-pulse relative"
      >
        <div className="glass-card p-6 md:p-8 flex flex-col items-center border border-white/[0.05]">
          <div className="h-6 bg-white/[0.06] rounded w-64 mb-4" />
          <div className="h-[72px] bg-white/[0.06] rounded w-full max-w-4xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card p-6 h-64 border border-white/[0.05]" />
          <div className="glass-card p-6 h-64 border border-white/[0.05]" />
        </div>
      </motion.div>
    );
  }

  const leftTakeaways = brief.takeaways.filter(
    (t) => t.asset.toLowerCase().includes("chứng khoán") || t.asset.toLowerCase().includes("cổ phiếu")
  );
  const rightTakeaways = brief.takeaways.filter((t) => !leftTakeaways.includes(t));

  const fallbackTakeaways = buildFallbackBriefTakeaways(brief);
  const hasLeft = leftTakeaways.length > 0;
  const finalLeft = padTakeaways(hasLeft ? leftTakeaways : brief.takeaways.slice(0, 1), fallbackTakeaways, 3);
  const finalRight = hasLeft ? rightTakeaways : brief.takeaways.slice(2);

  return (
    <motion.div
      variants={fadeIn}
      className="col-span-full space-y-4 relative w-full h-full flex flex-col"
    >
      {/* Top Executive Summary Box */}
      <div className="group relative overflow-hidden rounded-xl border border-[#E6B84F]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#E6B84F]/40 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,24,10,0.92)_0%,rgba(20,11,7,0.98)_72%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(230,184,79,0.12),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(255,229,0,0.06),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

        {/* Corner Decor */}
        <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[#E6B84F]/35" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#E6B84F]/20" />

        <div className="relative z-10 mb-2 border-b border-white/[0.06] pb-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="relative flex flex-col items-start px-2 sm:px-6 pt-0">
            <div className="w-full text-left">
              <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px] flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#E6B84F]" />
                BẢN TIN SÁNG AI
              </h3>
              <p className="mt-1 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-white/70">
                TÓM TẮT ĐIỀU HÀNH
              </p>
            </div>
          </div>
          <span className="text-xs text-white/50 sm:mt-2 hidden sm:flex items-center gap-1.5 font-mono uppercase font-black tracking-widest px-2 sm:px-6">
            <Calendar className="w-3.5 h-3.5" />
            {brief.date}
          </span>
        </div>
        <div className="relative z-10">
          <p className="text-[14px] text-white/85 leading-relaxed font-semibold tracking-normal w-full px-2 sm:px-6 text-justify">
            {brief.summary}
          </p>
        </div>
      </div>

      {/* Two Column Detail Area */}
      <div className="grid lg:grid-cols-2 gap-4 flex-1">

        {/* Left Panel - Chứng khoán (Green Focus) */}
        <div className="group relative overflow-hidden rounded-xl border border-[#22C55E]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/40 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.18),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(0,229,255,0.08),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

          <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6">
            <div className="relative flex flex-col items-start px-2 sm:px-6 pt-2">
              <div className="w-full text-left">
                <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center border border-[#22C55E]/20">
                    <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  CHỨNG KHOÁN
                </h3>
                <p className="mt-4 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-[#22C55E]/75">
                  PHÂN TÍCH
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative z-10 h-full px-2 sm:px-6">
            {finalLeft.map((t, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="text-2xl mt-0.5 flex-shrink-0 opacity-90 group-hover:scale-110 transition-transform duration-300">{t.emoji}</span>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-heading text-[15px] font-black uppercase tracking-wide text-[#22C55E]/90">
                    {t.asset}
                  </h4>
                  <p className="mt-1.5 text-[14px] leading-relaxed font-semibold text-white/80">
                    {t.text}
                  </p>
                </div>
              </div>
            ))}
            {finalLeft.length === 0 && (
              <p className="text-[13px] text-white/30 italic py-4">Không có phân tích chứng khoán hôm nay.</p>
            )}
          </div>
        </div>

        {/* Right Panel - Vàng & Vĩ mô (Gold Focus) */}
        <div className="group relative overflow-hidden rounded-xl border border-[#E6B84F]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#E6B84F]/40 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,24,10,0.92)_0%,rgba(20,11,7,0.98)_72%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(230,184,79,0.12),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(255,229,0,0.06),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

          <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6">
            <div className="relative flex flex-col items-start px-2 sm:px-6 pt-2">
              <div className="w-full text-left">
                <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E6B84F]/10 flex items-center justify-center border border-[#E6B84F]/20">
                    <BarChart3 className="w-4 h-4 text-[#E6B84F]" />
                  </div>
                  VÀNG & VĨ MÔ
                </h3>
                <p className="mt-4 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-[#E6B84F]/75">
                  NHẬN ĐỊNH
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 relative z-10 h-full px-2 sm:px-6">
            {finalRight.map((t, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="text-2xl mt-0.5 flex-shrink-0 opacity-90 group-hover:scale-110 transition-transform duration-300">{t.emoji}</span>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-heading text-[15px] font-black uppercase tracking-wide text-[#E6B84F]/90">
                    {t.asset}
                  </h4>
                  <p className="mt-1.5 text-[14px] leading-relaxed font-semibold text-white/80">
                    {t.text}
                  </p>
                </div>
              </div>
            ))}
            {finalRight.length === 0 && (
              <p className="text-[13px] text-white/30 italic py-4">Không có phân tích nào khác hôm nay.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NewsFeed({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  const [activeTab, setActiveTab] = useState("Tất cả");
  const TABS = ["Tất cả", "Trang chủ", "Kinh tế vĩ mô", "Chứng khoán", "Bất động sản", "Khác"];

  const filteredItems = useMemo(() => {
    if (loading || !items.length) return [];
    if (activeTab === "Tất cả") return items.slice(0, 10);

    const isMatch = (item: NewsItem, tab: string) => {
      const cat = item.category?.toLowerCase() || "";
      if (tab === "Chứng khoán") return cat.includes("chứng khoán");
      if (tab === "Kinh tế vĩ mô") return cat.includes("vĩ mô");
      if (tab === "Bất động sản") return cat.includes("bat dong san") || cat.includes("bất động sản");
      if (tab === "Trang chủ") return cat.includes("kinh doanh") || cat.includes("kinh tế") || cat.includes("tài chính");
      return false;
    };

    if (activeTab === "Khác") {
      const mainTabs = ["Trang chủ", "Kinh tế vĩ mô", "Chứng khoán", "Bất động sản"];
      return items.filter((item) => !mainTabs.some((tab) => isMatch(item, tab))).slice(0, 10);
    }

    return items.filter((item) => isMatch(item, activeTab)).slice(0, 10);
  }, [items, activeTab, loading]);

  return (
    <motion.div
      variants={fadeIn}
      className="group relative h-full overflow-hidden rounded-xl border border-[#22C55E]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#22C55E]/40 md:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,31,24,0.92)_0%,rgba(7,11,20,0.98)_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,0.18),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(0,229,255,0.08),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Corner Decor */}
      <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[#22C55E]/35" />
      <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#22C55E]/20" />

      <div className="relative z-10 mb-6 border-b border-white/[0.06] pb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between px-2 sm:px-6">
        <div className="relative flex flex-col items-start pt-2">
          <div className="w-full text-left">
            <h3 className="font-heading text-[24px] font-black uppercase leading-[1.1] tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.08)] sm:text-[32px] flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#22C55E]/25 bg-[#22C55E]/10 flex-shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E] shadow-[0_0_14px_rgba(34,197,94,0.9)]" />
              </div>
              TIN TỨC THỊ TRƯỜNG
            </h3>
            <p className="mt-4 font-mono text-[12px] font-black uppercase tracking-[0.2em] text-white/70">
              MARKET NEWS TERMINAL
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/news"
          className="group/link inline-flex w-fit items-center gap-1.5 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#22C55E] transition-colors hover:bg-[#22C55E]/15"
        >
          Toàn bộ tin <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative z-10 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-lg border px-4 py-2 font-heading text-[12px] font-black uppercase tracking-[0.14em] transition-all",
              activeTab === tab
                ? "border-[#22C55E]/35 bg-[#22C55E]/15 text-[#22C55E] shadow-[0_0_18px_rgba(34,197,94,0.12)]"
                : "border-white/[0.08] bg-white/[0.03] text-white/65 hover:border-white/[0.16] hover:text-white/85"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="relative z-10 mb-1 rounded-lg border border-white/[0.05] bg-white/[0.04] px-4 py-3 font-mono text-[11px] font-black uppercase tracking-[0.12em] text-white/55">
        Toàn news
      </div>

      <div className="relative z-10 max-h-[430px] overflow-y-auto pr-2 [scrollbar-color:#22C55E33_transparent] [scrollbar-width:thin]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (loading ? "-loading" : "-ready")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="divide-y divide-white/[0.06]"
          >
            {loading ? (
              [1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="animate-pulse py-4">
                  <div className="mb-2 h-4 w-4/5 rounded bg-white/[0.07]" />
                  <div className="h-3 w-1/3 rounded bg-white/[0.04]" />
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-white/10 bg-white/[0.01] py-16 text-center font-mono text-[12px] font-black uppercase tracking-widest text-white/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-white/[0.02]">
                  <X className="h-5 w-5 opacity-20" />
                </div>
                [ NO DATA IN THIS CATEGORY ]
              </div>
            ) : (
              filteredItems.map((n: NewsItem, i: number) => {
                const s = sentimentTag[n.sentiment] || sentimentTag.neutral;

                return (
                  <motion.div
                    key={`${n.title}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.22 }}
                    className="group/news relative grid cursor-pointer grid-cols-[1fr_auto] gap-6 py-5 px-3 transition-colors hover:bg-[#22C55E]/[0.05] rounded-xl mb-1"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-heading text-[16px] font-black leading-snug tracking-wide text-white transition-colors group-hover/news:text-[#22C55E]">
                        {n.title}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                        <span className="text-[#22C55E] opacity-80">{n.source}</span>
                        <span className="text-white/20">/</span>
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-white/30" />
                          {n.time.includes("vừa xong") ? "MỚI ĐÂY" : n.time.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start pt-1.5">
                      <span
                        className="rounded border px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.16em] shadow-[0_0_12px_rgba(0,0,0,0.2)]"
                        style={{ color: s.color, backgroundColor: `${s.color}15`, borderColor: `${s.color}40` }}
                      >
                        {s.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
export default function DashboardOverview() {
  const [showSetup, setShowSetup] = useState(false);
  const [liveArticles, setLiveArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [aiBrief, setAiBrief] = useState<BriefData | null>(null);
  const [aiBriefLoading, setAiBriefLoading] = useState(true);
  const [netWorth, setNetWorth] = useState<number | null>(null);
  const [monthlyDeltaPct, setMonthlyDeltaPct] = useState<number>(0);
  const [hasSavedIncome, setHasSavedIncome] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Morning Brief AI
  useEffect(() => {
    const fetchMorningBrief = async () => {
      setAiBriefLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch("/api/morning-brief", { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data || !data.summary) throw new Error("Invalid brief payload");
        setAiBrief({
          date: data.date || `Hôm nay, ${new Date().toLocaleDateString("vi-VN")}`,
          title: data.title || "Bản tin sáng AI",
          summary: data.summary,
          raw: data.raw ?? data.summary,
          takeaways: Array.isArray(data.takeaways) ? data.takeaways : [],
          source: data.source ?? "heuristic",
        });
      } catch {
        // BriefCard already shows the loading fallback; failed fetches should not block the dashboard.
      } finally {
        setAiBriefLoading(false);
      }
    };

    fetchMorningBrief();
  }, []);

  // Net worth calculation from onboarding and current activity
  useEffect(() => {
    const onboarding = getOnboardingData();
    const pots = getBudgetPots();
    const expenses = getExpenses();
    const income = getIncome();

    const potTotal = pots.reduce(
      (sum, pot) => sum + (Number.isFinite(pot.allocated) ? pot.allocated : 0),
      0
    );
    const spentTotal = expenses.reduce(
      (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
      0
    );

    // Logic: If user has a net worth snapshot from onboarding, use it as baseline
    // If not, fallback to pot-based calculation
    const onboardingNetWorth = onboarding.netWorth || 0;

    let computedNetWorth = 0;
    if (onboardingNetWorth > 0) {
      // Net Worth = Initial Snapshot + (Allocated in Pots - Spent)
      // Note: This assumes pots are funded by income that was NOT part of the initial snapshot, 
      // or we just want to show the snapshot as the primary number for now.
      // Given the user expectation "Why does it show 12M instead of 50M", they want to see the 50M.
      computedNetWorth = onboardingNetWorth;
    } else {
      const net = potTotal - spentTotal;
      const hasData = pots.length > 0 || expenses.length > 0;
      computedNetWorth = hasData ? net : income ? income * 2.5 : 0;
    }

    setNetWorth(computedNetWorth);
    setMonthlyDeltaPct(income > 0 ? Math.round(((potTotal - spentTotal) / income) * 100) : 0);
    setHasSavedIncome(income > 0);
    setMounted(true); // Ensure mounted state is set
  }, []);

  // News fetch
  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const resp = await fetch("/api/news");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.articles && Array.isArray(data.articles)) {
        setLiveArticles(data.articles);
      }
    } catch {
      // keep existing articles or empty
    } finally {
      setNewsLoading(false);
    }
  };

  // Portfolio allocation calculation
  const [currentAllocation, setCurrentAllocation] = useState<AllocationItem[]>(
    adjustAllocation(BASE_ALLOCATIONS.balanced, 50)
  );

  useEffect(() => {
    const riskResult = getRiskResult();
    const marketSnapshot = getMarketCache();

    // Calculate FG score from cache
    let fgScore = 50;
    if (marketSnapshot?.vnIndex) {
      const vn = marketSnapshot.vnIndex.changePct ?? 0;
      const gold = marketSnapshot.goldSjc?.changePct ?? 0;
      fgScore = Math.round(Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)));
    }

    let finalAllocation: AllocationItem[];
    if (!riskResult) {
      finalAllocation = adjustAllocation(BASE_ALLOCATIONS.balanced, fgScore);
    } else {
      const score = riskResult?.score ?? 0;
      const riskType = score <= 6 ? "conservative" : score <= 10 ? "balanced" : "growth";
      const base = BASE_ALLOCATIONS[riskType] || BASE_ALLOCATIONS.balanced;
      finalAllocation = adjustAllocation(base, fgScore);
    }

    setCurrentAllocation(finalAllocation);
  }, []);

  // Init: run once on mount
  useEffect(() => {
    setMounted(true);
    if (isFirstTimeUser()) setShowSetup(true);
    fetchNews();

    const handleStorage = (event?: StorageEvent) => {
      if (!event || ["vietfi_pots", "vietfi_expenses", "vietfi_income"].includes(event.key ?? "")) {
        // Re-compute net worth from localStorage
        const pots = getBudgetPots();
        const expenses = getExpenses();
        const income = getIncome();
        const potTotal = pots.reduce(
          (sum, pot) => sum + (Number.isFinite(pot.allocated) ? pot.allocated : 0),
          0
        );
        const spentTotal = expenses.reduce(
          (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
          0
        );
        const net = potTotal - spentTotal;
        const hasData = pots.length > 0 || expenses.length > 0;
        setNetWorth(hasData ? net : income ? income * 2.5 : 0);
        setMonthlyDeltaPct(income > 0 ? Math.round((net / income) * 100) : 0);
        setHasSavedIncome(income > 0);
      }
    };

    window.addEventListener("storage", handleStorage);
    // Same-tab writes (Vẹt Vàng, ledger) don't fire "storage"; the transaction store broadcasts them.
    const onChanged = () => handleStorage();
    window.addEventListener(FINANCE_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FINANCE_CHANGED_EVENT, onChanged);
    };
  }, []);

  const liveBrief = aiBrief;
  const briefLoading = aiBriefLoading;
  const netWorthMillions = netWorth === null ? null : Math.round((netWorth / 1_000_000) * 10) / 10;
  const netWorthAccessibleText = netWorthMillions === null ? null : `${netWorthMillions.toFixed(1)} tri\u1ec7u`;
  const incomeAccessibleText = hasSavedIncome ? '\u0110\u00e3 l\u01b0u thu nh\u1eadp' : 'Ch\u01b0a c\u00f3 thu nh\u1eadp';

  const liveNews: NewsItem[] = useMemo(() => {
    if (liveArticles.length === 0) return FALLBACK_NEWS;
    return liveArticles.map((a) => ({
      title: a.title,
      source: a.source,
      time: formatTimeAgo(a.published),
      sentiment: a.sentiment,
      category: a.category,
    }));
  }, [liveArticles]);

  const netWorthHistory = useMemo(() => {
    if (!mounted || netWorth === null) return [];

    const entries = getLedgerEntries();
    const now = new Date();
    const history: { m: string; v: number; amount: string; isCurrent?: boolean; isEmpty?: boolean }[] = [];

    // Group ledger entries by month
    const ledgerByMonth: Record<string, number> = {};
    entries.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const val = e.type === 'income' ? e.amount : -e.amount;
      ledgerByMonth[key] = (ledgerByMonth[key] || 0) + val;
    });

    let runningNetWorth = netWorth;

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const monthLabel = `T${d.getMonth() + 1}`;

      const hasData = i === 0 || ledgerByMonth[key] !== undefined;

      if (hasData) {
        const millions = runningNetWorth / 1_000_000;
        history.unshift({
          m: monthLabel,
          v: millions,
          amount: millions >= 1000 ? `${(millions / 1000).toFixed(1)} TỶ` : `${millions.toFixed(1)} TRIỆU`,
          isCurrent: i === 0,
          isEmpty: false
        });
      }

      // Calculate previous month's net worth (going backwards)
      runningNetWorth -= (ledgerByMonth[key] || 0);
    }

    // Nếu chỉ có 1 cột, thêm 2 cột trống 2 bên cho cân đối (theo yêu cầu user)
    if (history.length === 1) {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const prevD = new Date(currentYear, currentMonth - 1, 1);
      const nextD = new Date(currentYear, currentMonth + 1, 1);

      history.unshift({
        m: `T${prevD.getMonth() + 1}`,
        v: 0,
        amount: "0 TRIỆU",
        isEmpty: true
      });

      history.push({
        m: `T${nextD.getMonth() + 1}`,
        v: 0,
        amount: "0 TRIỆU",
        isEmpty: true
      });
    }

    const maxVal = Math.max(...history.map(h => h.v), 1);
    return history.map(h => ({
      ...h,
      v: Math.max(10, (h.v / maxVal) * 85) // Scale to 85% max height
    }));
  }, [mounted, netWorth]);

  return (
    <>
      {showSetup && (
        <QuickSetupWizard
          onComplete={() => {
            setShowSetup(false);
            window.location.reload();
          }}
          onSkip={() => setShowSetup(false)}
        />
      )}
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        {/* Notification Permission Banner */}
        <NotificationBanner />

        {/* Market Metrics Grid + F&G Gauge + Morning Brief */}
        <div className="mb-4">
          <MarketSection
            pinnedElement={
              <NetWorthCard
                netWorthMillions={netWorthMillions}
                monthlyDeltaPct={monthlyDeltaPct}
                mounted={mounted}
                chartData={netWorthHistory}
              />
            }
            briefElement={<BriefCard brief={liveBrief} loading={briefLoading} />}
          />
        </div>

        <motion.div
          variants={fadeIn}
          className="mb-6 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]"
        >
          <DailyQuestSection className="mb-0 h-full" />

          <div className="group relative overflow-hidden rounded-xl border border-[#E6B84F]/20 bg-[#08110f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-all duration-500 hover:border-[#E6B84F]/40 md:p-8 h-full">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,24,10,0.92)_0%,rgba(20,11,7,0.98)_72%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(230,184,79,0.12),transparent_46%),radial-gradient(circle_at_82%_0%,rgba(255,229,0,0.06),transparent_30%)] opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:40px_40px]" />

            <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[#E6B84F]/35" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[#E6B84F]/20" />
            <div className="relative z-10">
              <BadgeGrid showProgress={false} compact />
            </div>
          </div>
        </motion.div>
        {/* Portfolio Allocation + News Terminal */}
        <motion.div variants={stagger} className="mb-4 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <PortfolioMini allocation={currentAllocation} />
          <NewsFeed items={liveNews} loading={newsLoading} />
        </motion.div>
      </motion.div>
    </>
  );
}
