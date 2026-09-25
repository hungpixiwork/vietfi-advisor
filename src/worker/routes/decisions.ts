import { Hono } from "hono";
import { Env } from "../types";
import { formatApiResponse, DecisionSimulationRequestDto } from "../schemas";
import {
  simulateFinancialDecision,
  FinancialProfileInput,
} from "../../lib/finance/engine";

export const decisionsRoute = new Hono<{ Bindings: Env }>();

decisionsRoute.post("/simulate", async (c) => {
  try {
    const body = await c.req.json<DecisionSimulationRequestDto>();

    if (!body.title || !body.costAmount || !body.paymentMethod) {
      return c.json(
        { error: "Thiếu thông tin quyết định: title, costAmount, paymentMethod là bắt buộc." },
        400
      );
    }

    // Default profile baseline if not sent from client or not logged in
    const defaultProfile: FinancialProfileInput = {
      monthlyIncome: 18_000_000,
      monthlyExpense: 11_000_000,
      currentCash: 35_000_000,
      totalDebt: 8_000_000,
      monthlyDebtPayment: 2_000_000,
    };

    const profile: FinancialProfileInput = body.profile || defaultProfile;

    const result = simulateFinancialDecision(profile, {
      title: body.title,
      costAmount: body.costAmount,
      paymentMethod: body.paymentMethod,
      interestRateAnnualPct: body.interestRateAnnualPct,
    });

    return c.json(formatApiResponse(result, "vietfi-deterministic-engine"));
  } catch (error: any) {
    return c.json({ error: error?.message || "Lỗi xử lý mô phỏng quyết định." }, 500);
  }
});
