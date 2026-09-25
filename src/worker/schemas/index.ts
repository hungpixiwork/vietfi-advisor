import { ApiResponse } from "../types";

export function formatApiResponse<T>(data: T, source: string = "vietfi-engine"): ApiResponse<T> {
  return {
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      source,
    },
  };
}

export interface MeSummaryDto {
  userId: string;
  fullName: string;
  email: string;
  netWorth: number;
  totalCash: number;
  totalDebt: number;
  monthlySurplus: number;
  emergencyFundMonths: number;
}

export interface DecisionSimulationRequestDto {
  title: string;
  costAmount: number;
  paymentMethod: "FULL_CASH" | "INSTALLMENT_6M" | "INSTALLMENT_12M" | "INSTALLMENT_24M";
  interestRateAnnualPct?: number;
  profile?: {
    monthlyIncome: number;
    monthlyExpense: number;
    currentCash: number;
    totalDebt: number;
    monthlyDebtPayment: number;
  };
}
