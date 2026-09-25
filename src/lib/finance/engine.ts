/**
 * VietFi Deterministic Finance Engine
 * 100% pure TypeScript, zero external dependencies, 0ms execution time.
 * Calculates Cash Flow, Emergency Fund, DTI, Goals, Health Score, and Decision Simulations.
 */

export interface FinancialProfileInput {
  monthlyIncome: number;
  monthlyExpense: number;
  currentCash: number;
  totalDebt: number;
  monthlyDebtPayment: number;
  goals?: Array<{
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadlineMonths?: number;
  }>;
}

export interface FinancialHealthAnalysis {
  monthlySurplus: number;
  savingsRate: number; // percentage (0 - 100)
  emergencyFundMonths: number;
  emergencyFundStatus: "CRITICAL" | "WARNING" | "HEALTHY" | "EXCELLENT";
  dtiRatio: number; // Debt-to-Income percentage
  dtiStatus: "SAFE" | "ATTENTION" | "RISK" | "CRITICAL";
  healthScore: number; // 0 - 100
  healthLabel: "YẾU" | "TRUNG BÌNH" | "KHÁ" | "VỮNG MẠNH";
  riskFlags: string[];
  safeForDiscretionarySpend: number; // Số tiền an toàn có thể chi tối đa trong tháng
}

export interface DecisionScenarioInput {
  title: string;
  costAmount: number;
  paymentMethod: "FULL_CASH" | "INSTALLMENT_6M" | "INSTALLMENT_12M" | "INSTALLMENT_24M";
  interestRateAnnualPct?: number; // Lãi suất hoặc phí chuyển đổi (%)
}

export interface SimulationStateComparison {
  cash: number;
  emergencyFundMonths: number;
  monthlySurplus: number;
  dtiRatio: number;
  riskStatus: "SAFE" | "MODERATE" | "HIGH_RISK" | "CRITICAL";
}

export interface DecisionSimulationResult {
  scenarioTitle: string;
  costAmount: number;
  paymentMethod: string;
  monthlyPaymentAddon: number;
  before: SimulationStateComparison;
  after: SimulationStateComparison;
  impactSummary: {
    cashDelta: number;
    emergencyMonthsDelta: number;
    surplusDelta: number;
    dtiDelta: number;
  };
  riskFlags: string[];
  verdict: {
    level: "RECOMMENDED" | "FEASIBLE_WITH_CAUTION" | "NOT_RECOMMENDED" | "DANGEROUS";
    title: string;
    description: string;
  };
  smartAlternative: {
    title: string;
    description: string;
    monthlySavingsNeeded: number;
    timelineMonths: number;
    projectedCashPreserved: number;
  };
  actionChecklist: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CASH FLOW & FINANCIAL HEALTH ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeFinancialHealth(profile: FinancialProfileInput): FinancialHealthAnalysis {
  const income = Math.max(0, profile.monthlyIncome);
  const expense = Math.max(1, profile.monthlyExpense); // Tránh chia cho 0
  const cash = Math.max(0, profile.currentCash);
  const debtPayment = Math.max(0, profile.monthlyDebtPayment);

  // 1. Dòng tiền thặng dư hàng tháng
  const monthlySurplus = income - expense - debtPayment;
  const savingsRate = income > 0 ? Math.round((Math.max(0, monthlySurplus) / income) * 100) : 0;

  // 2. Quỹ khẩn cấp (tính theo số tháng chi tiêu tối thiểu)
  const emergencyFundMonths = Math.round((cash / expense) * 10) / 10;
  let emergencyFundStatus: FinancialHealthAnalysis["emergencyFundStatus"] = "HEALTHY";
  if (emergencyFundMonths < 1) emergencyFundStatus = "CRITICAL";
  else if (emergencyFundMonths < 3) emergencyFundStatus = "WARNING";
  else if (emergencyFundMonths >= 6) emergencyFundStatus = "EXCELLENT";

  // 3. Tỷ lệ Nợ trên Thu nhập (DTI - Debt-to-Income)
  const dtiRatio = income > 0 ? Math.round((debtPayment / income) * 1000) / 10 : 0;
  let dtiStatus: FinancialHealthAnalysis["dtiStatus"] = "SAFE";
  if (dtiRatio > 45) dtiStatus = "CRITICAL";
  else if (dtiRatio > 36) dtiStatus = "RISK";
  else if (dtiRatio > 20) dtiStatus = "ATTENTION";

  // 4. Phát hiện Rủi ro (Risk Flags)
  const riskFlags: string[] = [];
  if (monthlySurplus < 0) {
    riskFlags.push(`Dòng tiền âm ${Math.abs(monthlySurplus).toLocaleString("vi-VN")} đ/tháng. Đang thâm hụt tài sản.`);
  }
  if (emergencyFundMonths < 3) {
    riskFlags.push(`Quỹ khẩn cấp chỉ còn ${emergencyFundMonths} tháng (chuẩn an toàn tối thiểu 3 - 6 tháng).`);
  }
  if (dtiRatio > 36) {
    riskFlags.push(`Gánh nặng trả nợ DTI ở mức ${dtiRatio}%, vượt ngưỡng an toàn tài chính cá nhân.`);
  }
  if (savingsRate < 10 && monthlySurplus >= 0) {
    riskFlags.push(`Tỷ lệ tích lũy quá mỏng (${savingsRate}%). Không đủ tạo đệm cho các mục tiêu dài hạn.`);
  }

  // 5. Chấm điểm Sức khỏe Tài chính (0 - 100)
  let score = 50;
  // Quỹ khẩn cấp: max 30đ
  score += Math.min(30, (emergencyFundMonths / 6) * 30);
  // DTI: max 25đ (DTI = 0 -> 25đ; DTI >= 50 -> 0đ)
  score += Math.max(0, 25 - (dtiRatio / 50) * 25);
  // Savings rate: max 25đ (savingsRate >= 30% -> 25đ)
  score += Math.min(25, (savingsRate / 30) * 25);
  // Thặng dư dương: +20đ
  if (monthlySurplus > 0) score += 20;
  else score -= 25;

  const healthScore = Math.min(100, Math.max(10, Math.round(score)));
  let healthLabel: FinancialHealthAnalysis["healthLabel"] = "TRUNG BÌNH";
  if (healthScore >= 80) healthLabel = "VỮNG MẠNH";
  else if (healthScore >= 65) healthLabel = "KHÁ";
  else if (healthScore < 45) healthLabel = "YẾU";

  // Số tiền an toàn có thể chi trong tháng
  const safeForDiscretionarySpend = Math.max(0, Math.round(monthlySurplus * 0.4));

  return {
    monthlySurplus,
    savingsRate,
    emergencyFundMonths,
    emergencyFundStatus,
    dtiRatio,
    dtiStatus,
    healthScore,
    healthLabel,
    riskFlags,
    safeForDiscretionarySpend,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DECISION IMPACT SIMULATOR ENGINE (HERO FEATURE)
// ─────────────────────────────────────────────────────────────────────────────

export function simulateFinancialDecision(
  profile: FinancialProfileInput,
  scenario: DecisionScenarioInput
): DecisionSimulationResult {
  const currentHealth = analyzeFinancialHealth(profile);

  const beforeRiskStatus: SimulationStateComparison["riskStatus"] =
    currentHealth.healthScore >= 75 ? "SAFE" :
    currentHealth.healthScore >= 50 ? "MODERATE" :
    currentHealth.healthScore >= 35 ? "HIGH_RISK" : "CRITICAL";

  const before: SimulationStateComparison = {
    cash: profile.currentCash,
    emergencyFundMonths: currentHealth.emergencyFundMonths,
    monthlySurplus: currentHealth.monthlySurplus,
    dtiRatio: currentHealth.dtiRatio,
    riskStatus: beforeRiskStatus,
  };

  // Tính toán theo phương thức thanh toán
  let simulatedCash = profile.currentCash;
  let monthlyAddon = 0;
  let durationMonths = 0;

  const cost = Math.max(0, scenario.costAmount);
  const feePct = scenario.interestRateAnnualPct || 0;

  if (scenario.paymentMethod === "FULL_CASH") {
    simulatedCash = Math.max(0, profile.currentCash - cost);
    monthlyAddon = 0;
    durationMonths = 0;
  } else {
    durationMonths = scenario.paymentMethod === "INSTALLMENT_6M" ? 6 :
                     scenario.paymentMethod === "INSTALLMENT_12M" ? 12 : 24;
    // Tổng số tiền trả gồm lãi/phí
    const totalCostWithFee = cost * (1 + (feePct / 100) * (durationMonths / 12));
    monthlyAddon = Math.round(totalCostWithFee / durationMonths);
  }

  // Tạo profile giả định sau quyết định
  const simulatedProfile: FinancialProfileInput = {
    ...profile,
    currentCash: simulatedCash,
    monthlyDebtPayment: profile.monthlyDebtPayment + monthlyAddon,
  };

  const simulatedHealth = analyzeFinancialHealth(simulatedProfile);

  const afterRiskStatus: SimulationStateComparison["riskStatus"] =
    simulatedHealth.healthScore >= 75 ? "SAFE" :
    simulatedHealth.healthScore >= 50 ? "MODERATE" :
    simulatedHealth.healthScore >= 35 ? "HIGH_RISK" : "CRITICAL";

  const after: SimulationStateComparison = {
    cash: simulatedCash,
    emergencyFundMonths: simulatedHealth.emergencyFundMonths,
    monthlySurplus: simulatedHealth.monthlySurplus,
    dtiRatio: simulatedHealth.dtiRatio,
    riskStatus: afterRiskStatus,
  };

  const impactSummary = {
    cashDelta: after.cash - before.cash,
    emergencyMonthsDelta: Math.round((after.emergencyFundMonths - before.emergencyFundMonths) * 10) / 10,
    surplusDelta: after.monthlySurplus - before.monthlySurplus,
    dtiDelta: Math.round((after.dtiRatio - before.dtiRatio) * 10) / 10,
  };

  // Bóc tách rủi ro phát sinh
  const riskFlags: string[] = [];
  if (scenario.paymentMethod === "FULL_CASH" && after.emergencyFundMonths < 2.5) {
    riskFlags.push(`Cạn kiệt quỹ dự phòng! Tiền mặt chỉ còn đủ trang trải ${after.emergencyFundMonths} tháng nếu xảy ra biến cố.`);
  }
  if (monthlyAddon > 0 && after.monthlySurplus < 500000) {
    riskFlags.push(`Dòng tiền tự do bị nghẽn! Mỗi tháng chỉ còn dư ${after.monthlySurplus.toLocaleString("vi-VN")} đ để xoay xở.`);
  }
  if (after.dtiRatio > 36) {
    riskFlags.push(`Bẫy nợ trả góp: Tỷ lệ nợ DTI nhảy vọt từ ${before.dtiRatio}% lên ${after.dtiRatio}%.`);
  }
  if (monthlyAddon > profile.monthlyIncome * 0.2) {
    riskFlags.push(`Khoản trả góp chiếm tới hơn 20% tổng thu nhập hàng tháng.`);
  }

  // Phán quyết (Verdict)
  let verdict: DecisionSimulationResult["verdict"] = {
    level: "RECOMMENDED",
    title: "Quyết Định An Toàn",
    description: "Bạn có đủ đệm tài chính và dòng tiền thặng dư tốt để thực hiện quyết định này mà không xáo trộn tương lai.",
  };

  if (after.monthlySurplus < 0 || after.emergencyFundMonths < 1.2 || after.dtiRatio > 45) {
    verdict = {
      level: "DANGEROUS",
      title: "CẢNH BÁO: RẤT NGUY HIỂM",
      description: "Quyết định này đẩy tài chính vào vùng cạn tiền mặt hoặc thâm hụt dòng tiền nặng. Vẹt Vàng khuyên bạn DỪNG LẠI NGAY!",
    };
  } else if (riskFlags.length >= 2 || after.emergencyFundMonths < 2.5 || after.dtiRatio > 35) {
    verdict = {
      level: "NOT_RECOMMENDED",
      title: "KHÔNG NÊN THỰC HIỆN BÂY GIỜ",
      description: "Quyết định này khiến khả năng chống đỡ rủi ro giảm mạnh. Bạn sẽ mất sự tự do tài chính trong ít nhất 6 - 12 tháng tới.",
    };
  } else if (riskFlags.length === 1 || after.emergencyFundMonths < 3.5) {
    verdict = {
      level: "FEASIBLE_WITH_CAUTION",
      title: "CÂN NHẮC THẬN TRỌNG",
      description: "Khả thi nhưng cần cắt giảm chi tiêu không thiết yếu khác trong kỳ hạn để bù đắp dòng tiền.",
    };
  }

  // Kịch bản thay thế thông minh (Smart Alternative)
  const targetAlternativeCost = Math.round(cost * 0.65); // Mua bản lướt / like new hoặc săn sale giảm 35%
  const waitMonths = Math.max(2, Math.min(10, Math.ceil(cost / Math.max(1000000, currentHealth.monthlySurplus * 0.7))));
  const monthlySavings = Math.round(cost / waitMonths);

  const smartAlternative = {
    title: waitMonths <= 3 ? "Chiến lược Trì hoãn 60-90 ngày" : "Chiến lược Tích lũy Hũ Riêng",
    description: waitMonths <= 3
      ? `Thay vì mua vội hoặc trả góp, hãy hoãn lại ${waitMonths} tháng. Mỗi tháng trích ${monthlySavings.toLocaleString("vi-VN")} đ vào hũ riêng. Bạn sẽ mua đứt mà quỹ khẩn cấp vẫn nguyên vẹn.`
      : `Cân nhắc phiên bản Like-New / Cấu hình tối ưu với mức giá ~${targetAlternativeCost.toLocaleString("vi-VN")} đ. Tiết kiệm ngay ${(cost - targetAlternativeCost).toLocaleString("vi-VN")} đ tiền mặt.`,
    monthlySavingsNeeded: monthlySavings,
    timelineMonths: waitMonths,
    projectedCashPreserved: profile.currentCash,
  };

  const actionChecklist = [
    `Khóa ngân sách: Đảm bảo quỹ khẩn cấp duy trì tối thiểu ${(profile.monthlyExpense * 3).toLocaleString("vi-VN")} đ.`,
    scenario.paymentMethod !== "FULL_CASH"
      ? `Kiểm tra biểu phí ẩn: Phí bảo hiểm khoản vay, phí phạt tất toán trước hạn.`
      : `Trích lập bù đắp: Lập kế hoạch nạp lại quỹ khẩn cấp trong vòng 3 tháng tới.`,
    `Tạo hũ mục tiêu "${scenario.title}" với mức nạp ${monthlySavings.toLocaleString("vi-VN")} đ/tháng.`,
  ];

  return {
    scenarioTitle: scenario.title,
    costAmount: cost,
    paymentMethod: scenario.paymentMethod,
    monthlyPaymentAddon: monthlyAddon,
    before,
    after,
    impactSummary,
    riskFlags,
    verdict,
    smartAlternative,
    actionChecklist,
  };
}
