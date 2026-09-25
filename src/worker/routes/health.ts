import { Hono } from "hono";
import { Env } from "../types";
import { formatApiResponse } from "../schemas";
import { analyzeFinancialHealth, FinancialProfileInput } from "../../lib/finance/engine";

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get("/", async (c) => {
  try {
    const profile: FinancialProfileInput = {
      monthlyIncome: 18_000_000,
      monthlyExpense: 11_000_000,
      currentCash: 35_000_000,
      totalDebt: 8_000_000,
      monthlyDebtPayment: 2_000_000,
    };

    const analysis = analyzeFinancialHealth(profile);
    return c.json(formatApiResponse(analysis, "vietfi-health-engine"));
  } catch (error: any) {
    return c.json({ error: error?.message || "Lỗi phân tích sức khỏe tài chính." }, 500);
  }
});
