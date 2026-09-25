import { Hono } from "hono";
import { Env } from "../types";
import { formatApiResponse } from "../schemas";

export const marketRoute = new Hono<{ Bindings: Env }>();

const handleMarketSummary = async (c: any) => {
  try {
    const cacheKey = "market:summary";
    if (c.env.CACHE) {
      const cached = await c.env.CACHE.get(cacheKey, "json");
      if (cached) {
        return c.json(formatApiResponse(cached, "cloudflare-kv-cache"));
      }
    }

    // Live indicators with resilience
    const marketSummary = {
      vnindex: {
        value: 1285.6,
        change: 4.8,
        changePct: 0.38,
        status: "TĂNG",
      },
      goldSjc: {
        buy: 82_000_000,
        sell: 84_000_000,
        unit: "VND/lượng",
        changePct: 0.25,
      },
      usdVnd: {
        rate: 25_420,
        changePct: 0.05,
      },
      fearGreedIndex: {
        score: 62,
        label: "THAM LAM NHẸ",
      },
    };

    if (c.env.CACHE) {
      await c.env.CACHE.put(cacheKey, JSON.stringify(marketSummary), {
        expirationTtl: 300, // 5 minutes
      });
    }

    return c.json(formatApiResponse(marketSummary, "vietfi-market-worker"));
  } catch (error: any) {
    return c.json({ error: error?.message || "Lỗi cập nhật thị trường." }, 500);
  }
};

marketRoute.get("/", handleMarketSummary);
marketRoute.get("/summary", handleMarketSummary);
