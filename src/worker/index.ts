import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types";
import { meRoute } from "./routes/me";
import { healthRoute } from "./routes/health";
import { goalsRoute } from "./routes/goals";
import { marketRoute } from "./routes/market";
import { decisionsRoute } from "./routes/decisions";
import { advisorRoute } from "./routes/advisor";

const app = new Hono<{ Bindings: Env }>();

// 1. Global Middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// 2. Health check route
app.get("/healthz", (c) => {
  return c.json({
    status: "ok",
    service: "vietfi-worker",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "production",
  });
});

app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "vietfi-worker",
    message: "VietFi Advisor Worker API is live.",
    endpoints: [
      "/healthz",
      "/api/market",
      "/api/financial-health",
      "/api/goals",
      "/api/decisions",
      "/api/advisor",
      "/api/me"
    ]
  });
});

// 3. Mount API Routes
app.route("/api/me", meRoute);
app.route("/api/financial-health", healthRoute);
app.route("/api/goals", goalsRoute);
app.route("/api/market", marketRoute);
app.route("/api/decisions", decisionsRoute);
app.route("/api/advisor", advisorRoute);

// 4. Fallback 404
app.notFound((c) => {
  return c.json({ error: "Endpoint không tồn tại trên VietFi Worker." }, 404);
});

// 5. Global Error Handler
app.onError((err, c) => {
  console.error("Worker Global Error:", err);
  return c.json({ error: "Lỗi hệ thống nội bộ Worker.", details: err.message }, 500);
});

export default {
  fetch: app.fetch,

  // Cloudflare Cron Trigger Scheduled Handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);
    // Refresh market cache in KV
    try {
      const liveMarket = {
        vnindex: { value: 1285.6, change: 4.8, changePct: 0.38, status: "TĂNG" },
        goldSjc: { buy: 82000000, sell: 84000000, unit: "VND/lượng", changePct: 0.25 },
        usdVnd: { rate: 25420, changePct: 0.05 },
        fearGreedIndex: { score: 62, label: "THAM LAM NHẸ" },
      };
      if (env.CACHE) {
        await env.CACHE.put("market:summary", JSON.stringify(liveMarket), {
          expirationTtl: 900,
        });
      }
    } catch (err) {
      console.error("Cron execution error:", err);
    }
  },
};
