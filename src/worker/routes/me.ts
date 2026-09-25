import { Hono } from "hono";
import { Env } from "../types";
import { formatApiResponse, MeSummaryDto } from "../schemas";

export const meRoute = new Hono<{ Bindings: Env }>();

meRoute.get("/summary", async (c) => {
  try {
    // If D1 is connected, query profile; otherwise return demo default
    let profileData: MeSummaryDto = {
      userId: "guest_demo",
      fullName: "Nhà Khám Phá Tài Chính",
      email: "demo@vietfi.app",
      netWorth: 38_000_000,
      totalCash: 35_000_000,
      totalDebt: 8_000_000,
      monthlySurplus: 5_000_000,
      emergencyFundMonths: 3.2,
    };

    if (c.env.DB) {
      try {
        const row = await c.env.DB.prepare(
          `SELECT u.id, u.full_name, u.email, p.monthly_income, p.monthly_expenses, p.emergency_fund
           FROM users u
           LEFT JOIN financial_profiles p ON u.id = p.user_id
           LIMIT 1`
        ).first();

        if (row) {
          const income = Number(row.monthly_income || 0);
          const expense = Number(row.monthly_expenses || 0);
          const cash = Number(row.emergency_fund || 0);
          profileData = {
            userId: String(row.id),
            fullName: String(row.full_name || "Thành viên VietFi"),
            email: String(row.email || ""),
            netWorth: Math.max(0, cash),
            totalCash: cash,
            totalDebt: 0,
            monthlySurplus: income - expense,
            emergencyFundMonths: expense > 0 ? Math.round((cash / expense) * 10) / 10 : 0,
          };
        }
      } catch (dbErr) {
        console.warn("D1 query skipped or table not initialized yet, using standard summary:", dbErr);
      }
    }

    return c.json(formatApiResponse(profileData, "vietfi-d1-store"));
  } catch (error: any) {
    return c.json({ error: error?.message || "Lỗi truy vấn hồ sơ." }, 500);
  }
});
