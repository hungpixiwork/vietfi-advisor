import { generateText } from "ai";
import { getLlmModel, isLlmConfigured } from "@/lib/infrastructure/llm/client";
import {
  checkFixedWindowRateLimit,
  getClientIdentifier,
  jsonError,
  rateLimitResponse,
  readJsonWithLimit,
} from "@/lib/api-security";
import { interpretWithLlm, MAX_MESSAGE_CHARS, type Generate, type InterpretResult } from "@/lib/companion/llm-interpret";

export const runtime = "nodejs";
export const maxDuration = 10;

const rateLimitBucket = new Map<string, { count: number; resetAt: number }>();

const generate: Generate = async (prompt, signal) => {
  const { text } = await generateText({
    model: getLlmModel(),
    prompt,
    temperature: 0,
    maxOutputTokens: 400,
    maxRetries: 0,
    abortSignal: signal,
  });
  return text;
};

function json(body: InterpretResult, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function handleInterpret(req: Request, gen: Generate = generate, configured = isLlmConfigured()): Promise<Response> {
  const rl = checkFixedWindowRateLimit(rateLimitBucket, getClientIdentifier(req), 20, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter, "Bạn gửi nhanh quá, đợi chút nhé.");

  const parsed = await readJsonWithLimit(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;

  const message = (parsed.value as { message?: unknown })?.message;
  if (typeof message !== "string" || message.trim().length === 0) return jsonError("Thiếu nội dung tin nhắn", 400);
  if (message.length > MAX_MESSAGE_CHARS) return jsonError("Tin nhắn quá dài", 413);

  if (!configured) return json({ status: "unavailable", reason: "llm not configured" });

  const result = await interpretWithLlm(message.trim(), gen);
  // Log only the outcome — never the user's message (it contains personal finance data).
  if (result.status !== "ok") console.warn(`[companion/interpret] ${result.status}: ${result.reason}`);
  return json(result);
}

export async function POST(req: Request) {
  return handleInterpret(req);
}
