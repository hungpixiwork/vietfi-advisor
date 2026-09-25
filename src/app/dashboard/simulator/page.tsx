"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Zap,
  RotateCcw,
  Calendar,
  Wallet,
  Coins,
  ChevronRight,
} from "lucide-react";
import {
  simulateFinancialDecision,
  analyzeFinancialHealth,
  FinancialProfileInput,
  DecisionScenarioInput,
  DecisionSimulationResult,
} from "@/lib/finance/engine";
import { addXP } from "@/lib/gamification";
import { getIncome, getPots, getDebts } from "@/lib/storage";

// Kịch bản mẫu cho Demo
const PRESET_SCENARIOS: Array<{
  id: string;
  title: string;
  cost: number;
  method: DecisionScenarioInput["paymentMethod"];
  icon: any;
  tag: string;
}> = [
  {
    id: "laptop-cash",
    title: "Mua Laptop 25tr (Trả thẳng tiền mặt)",
    cost: 25_000_000,
    method: "FULL_CASH",
    icon: Laptop,
    tag: "Rút quỹ dự phòng",
  },
  {
    id: "laptop-installment",
    title: "Trả góp Laptop 25tr (12 tháng)",
    cost: 25_000_000,
    method: "INSTALLMENT_12M",
    icon: CreditCard,
    tag: "Tăng gánh nợ DTI",
  },
  {
    id: "bike-cash",
    title: "Mua xe máy 45tr (Trả thẳng)",
    cost: 45_000_000,
    method: "FULL_CASH",
    icon: Coins,
    tag: "Chi tiêu lớn",
  },
  {
    id: "travel-spay",
    title: "Du lịch hè 15tr (Trả góp 6 tháng)",
    cost: 15_000_000,
    method: "INSTALLMENT_6M",
    icon: Zap,
    tag: "Tiêu dùng ngắn hạn",
  },
];

export default function DecisionSimulatorPage() {
  // 1. Hồ sơ tài chính nền tảng
  const [profile, setProfile] = useState<FinancialProfileInput>({
    monthlyIncome: 18_000_000,
    monthlyExpense: 11_000_000,
    currentCash: 35_000_000,
    totalDebt: 8_000_000,
    monthlyDebtPayment: 2_000_000,
  });

  // 2. Kịch bản đang chọn
  const [scenario, setScenario] = useState<DecisionScenarioInput>({
    title: "Mua Laptop Dell XPS 25 triệu",
    costAmount: 25_000_000,
    paymentMethod: "FULL_CASH",
    interestRateAnnualPct: 0,
  });

  const [activePreset, setActivePreset] = useState<string>("laptop-cash");
  const [simulation, setSimulation] = useState<DecisionSimulationResult | null>(null);
  const [activatedPlan, setActivatedPlan] = useState(false);

  // Nạp dữ liệu thực tế từ storage nếu có
  useEffect(() => {
    try {
      const inc = getIncome();
      const pots = getPots();
      const debts = getDebts();

      const income = inc && inc > 0 ? inc : 18_000_000;
      const cash = pots.reduce((sum, p) => sum + (p.amount || 0), 0) || 35_000_000;
      const totalDebt = debts.reduce((sum, d) => sum + (d.remaining || 0), 0) || 8_000_000;
      const debtPayment = debts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0) || 2_000_000;
      const expense = Math.max(8_000_000, Math.round(income * 0.6));

      setProfile({
        monthlyIncome: income,
        monthlyExpense: expense,
        currentCash: cash,
        totalDebt: totalDebt,
        monthlyDebtPayment: debtPayment,
      });
    } catch {
      // Fallback baseline
    }
  }, []);

  // Chạy simulation tức thì (Deterministic 0ms)
  useEffect(() => {
    const res = simulateFinancialDecision(profile, scenario);
    setSimulation(res);
    setActivatedPlan(false);
  }, [profile, scenario]);

  const handleSelectPreset = (preset: (typeof PRESET_SCENARIOS)[0]) => {
    setActivePreset(preset.id);
    setScenario({
      title: preset.title,
      costAmount: preset.cost,
      paymentMethod: preset.method,
      interestRateAnnualPct: preset.method === "FULL_CASH" ? 0 : 2.5,
    });
  };

  const handleActivatePlan = () => {
    setActivatedPlan(true);
    addXP("save_goal"); // +50 XP
  };

  if (!simulation) return null;

  const { before, after, impactSummary, verdict, smartAlternative } = simulation;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>CÔNG CỤ MÔ PHỎNG QUYẾT ĐỊNH (HERO FEATURE)</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Mô Phỏng Tác Động Tài Chính
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Thấy trước tương lai dòng tiền và rủi ro trước khi đưa ra quyết định xuống tiền.
            </p>
          </div>

          {/* Baseline pill */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
            <div>
              <p className="text-xs text-slate-500 font-medium">Thu nhập tháng</p>
              <p className="text-sm font-bold text-slate-800">
                {profile.monthlyIncome.toLocaleString("vi-VN")} đ
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Quỹ khẩn cấp</p>
              <p className="text-sm font-bold text-slate-800">
                {before.emergencyFundMonths} tháng ({profile.currentCash.toLocaleString("vi-VN")} đ)
              </p>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Chọn Kịch Bản Mua Sắm / Vay Nợ Cần Kiểm Tra
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_SCENARIOS.map((p) => {
              const Icon = p.icon;
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/20 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {p.tag}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 leading-snug">
                    {p.title}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 font-medium">
                    Giá trị: {p.cost.toLocaleString("vi-VN")} đ
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Decision Settings (Sliders / Toggles) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Chi tiết: {scenario.title}
              </h2>
              <p className="text-xs text-slate-500">
                Tùy chỉnh số tiền và phương thức để xem phản ứng động của tài chính cá nhân.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() =>
                  setScenario((s) => ({ ...s, paymentMethod: "FULL_CASH" }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scenario.paymentMethod === "FULL_CASH"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Trả Thẳng Tiền Mặt
              </button>
              <button
                onClick={() =>
                  setScenario((s) => ({ ...s, paymentMethod: "INSTALLMENT_12M" }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scenario.paymentMethod === "INSTALLMENT_12M"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Trả Góp 12 Tháng
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Số tiền giao dịch:</span>
                <span className="font-bold text-slate-900">
                  {scenario.costAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <input
                type="range"
                min={5_000_000}
                max={100_000_000}
                step={1_000_000}
                value={scenario.costAmount}
                onChange={(e) =>
                  setScenario((s) => ({ ...s, costAmount: Number(e.target.value) }))
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Hàng tháng chi thêm:</span>
                <span className="font-bold text-slate-900">
                  {simulation.monthlyPaymentAddon.toLocaleString("vi-VN")} đ/tháng
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {scenario.paymentMethod === "FULL_CASH"
                  ? "Rút trực tiếp 100% từ tiền mặt hiện có."
                  : `Phân bổ đều trong 12 kỳ hạn.`}
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Matrix */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2. So Sánh Đối Đầu: Trước (Before) vs Sau (After)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEFORE CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-500">Hiện Tại</span>
                  <h3 className="text-lg font-bold text-slate-900">Tài Chính Trước Quyết Định</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {before.riskStatus === "SAFE" ? "Vùng An Toàn" : "Đang Ổn Định"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Quỹ khẩn cấp:</span>
                  <span className="text-base font-bold text-slate-900">
                    {before.emergencyFundMonths} tháng{" "}
                    <span className="text-xs text-slate-500">
                      ({before.cash.toLocaleString("vi-VN")} đ)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Dòng tiền thặng dư:</span>
                  <span className="text-base font-bold text-emerald-700">
                    +{before.monthlySurplus.toLocaleString("vi-VN")} đ/tháng
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Gánh nặng nợ (DTI):</span>
                  <span className="text-base font-bold text-slate-900">
                    {before.dtiRatio}%{" "}
                    <span className="text-xs text-emerald-600 font-semibold">
                      (Dưới ngưỡng 20%)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* AFTER CARD */}
            <div
              className={`bg-white rounded-2xl p-6 shadow-xs border-2 relative overflow-hidden transition-all ${
                verdict.level === "DANGEROUS" || verdict.level === "NOT_RECOMMENDED"
                  ? "border-rose-400 bg-rose-50/20"
                  : "border-amber-400 bg-amber-50/20"
              }`}
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-500">Dự Phóng Tương Lai</span>
                  <h3 className="text-lg font-bold text-slate-900">Tài Chính Sau Quyết Định</h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    verdict.level === "DANGEROUS"
                      ? "bg-rose-100 text-rose-800"
                      : verdict.level === "NOT_RECOMMENDED"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {verdict.title}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Quỹ khẩn cấp:</span>
                  <span
                    className={`text-base font-extrabold ${
                      after.emergencyFundMonths < 2 ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {after.emergencyFundMonths} tháng{" "}
                    <span className="text-xs font-semibold text-rose-500">
                      ({impactSummary.emergencyMonthsDelta} tháng)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Dòng tiền thặng dư:</span>
                  <span
                    className={`text-base font-extrabold ${
                      after.monthlySurplus < 1_000_000 ? "text-rose-600" : "text-amber-700"
                    }`}
                  >
                    +{after.monthlySurplus.toLocaleString("vi-VN")} đ/tháng{" "}
                    {impactSummary.surplusDelta < 0 && (
                      <span className="text-xs font-semibold text-rose-500">
                        ({impactSummary.surplusDelta.toLocaleString("vi-VN")} đ)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Gánh nặng nợ (DTI):</span>
                  <span
                    className={`text-base font-extrabold ${
                      after.dtiRatio > 36 ? "text-rose-600" : "text-slate-900"
                    }`}
                  >
                    {after.dtiRatio}%{" "}
                    {impactSummary.dtiDelta > 0 && (
                      <span className="text-xs font-semibold text-rose-500">
                        (+{impactSummary.dtiDelta}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Alerts (if any) */}
        {simulation.riskFlags.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Điểm Nghẽn & Cảnh Báo Rủi Ro Bóc Trần Bởi VietFi Engine:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-rose-800 font-medium">
              {simulation.riskFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Vẹt Vàng AI Advice & Smart Alternative */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vẹt Vàng Persona Card */}
          <div className="lg:col-span-1 bg-amber-500 text-slate-950 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🦜</span>
                <h4 className="font-extrabold text-base tracking-tight text-slate-950">
                  Lời Phán Của Vẹt Vàng
                </h4>
              </div>
              <p className="text-xs leading-relaxed font-semibold text-slate-900">
                {verdict.level === "DANGEROUS" || verdict.level === "NOT_RECOMMENDED"
                  ? `Này bạn ơi! Rút tiền mặt mua xong thì quỹ khẩn cấp rơi tự do chỉ còn ${after.emergencyFundMonths} tháng. Lỡ ốm đau hay công ty chậm lương thì lấy gì xoay? Đừng để cảm xúc nhất thời bẫy bạn vào chu kỳ cạn tiền!`
                  : `Tài chính bạn khá cứng, sau khi mua vẫn giữ được ${after.emergencyFundMonths} tháng chi tiêu dự phòng. Nhưng nhớ giữ kỷ luật chi tiêu hũ khác trong 3 tháng tới!`}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-600/30 text-[11px] font-bold text-amber-950">
              💡 Triết lý: Thấy trước tác động trước khi xuống tiền.
            </div>
          </div>

          {/* Smart Alternative Strategy */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-base text-slate-900">
                    Phương Án Thay Thế Thông Minh: {smartAlternative.title}
                  </h4>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Vùng An Toàn
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {smartAlternative.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Tích lũy hàng tháng</p>
                  <p className="text-sm font-bold text-slate-900">
                    {smartAlternative.monthlySavingsNeeded.toLocaleString("vi-VN")} đ
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Thời gian chờ</p>
                  <p className="text-sm font-bold text-slate-900">
                    {smartAlternative.timelineMonths} tháng
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Bảo toàn quỹ khẩn cấp</p>
                  <p className="text-sm font-bold text-emerald-600">100% Nguyên Vẹn</p>
                </div>
              </div>
            </div>

            {/* 1-Click Action */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Biến mô phỏng thành hành động thực tế chỉ với 1 chạm.
              </span>

              <button
                onClick={handleActivatePlan}
                disabled={activatedPlan}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activatedPlan
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                }`}
              >
                {activatedPlan ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã Kích Hoạt Kế Hoạch 60 Ngày (+50 XP)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Kích Hoạt Kế Hoạch Tiết Kiệm Này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
