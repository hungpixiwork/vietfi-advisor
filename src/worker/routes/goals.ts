import { Hono } from "hono";
import { Env } from "../types";
import { formatApiResponse } from "../schemas";

export const goalsRoute = new Hono<{ Bindings: Env }>();

goalsRoute.get("/", async (c) => {
  try {
    const defaultGoals = [
      {
        id: "goal-1",
        title: "Quỹ Dự Phòng 6 Tháng",
        targetAmount: 66_000_000,
        currentAmount: 35_000_000,
        progressPct: 53,
        deadlineMonths: 6,
        category: "EMERGENCY",
      },
      {
        id: "goal-2",
        title: "Mua Laptop Công Việc",
        targetAmount: 25_000_000,
        currentAmount: 10_000_000,
        progressPct: 40,
        deadlineMonths: 3,
        category: "PURCHASE",
      },
      {
        id: "goal-3",
        title: "Quỹ Đầu Tư Tích Sản",
        targetAmount: 100_000_000,
        currentAmount: 15_000_000,
        progressPct: 15,
        deadlineMonths: 24,
        category: "INVESTMENT",
      },
    ];

    return c.json(formatApiResponse(defaultGoals, "vietfi-goals-store"));
  } catch (error: any) {
    return c.json({ error: error?.message || "Lỗi truy vấn danh sách mục tiêu." }, 500);
  }
});
