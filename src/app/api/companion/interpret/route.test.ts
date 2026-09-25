import { describe, expect, it, vi } from "vitest";
import { handleInterpret } from "./route";

const post = (body: unknown, ip = `10.0.0.${Math.floor(Math.random() * 250)}`) =>
  new Request("http://localhost/api/companion/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/companion/interpret", () => {
  it("400 on missing message", async () => {
    expect((await handleInterpret(post({}), vi.fn(), true)).status).toBe(400);
    expect((await handleInterpret(post({ message: "   " }), vi.fn(), true)).status).toBe(400);
  });

  it("400 on invalid JSON body", async () => {
    expect((await handleInterpret(post("{oops"), vi.fn(), true)).status).toBe(400);
  });

  it("413 on overly long messages", async () => {
    expect((await handleInterpret(post({ message: "a".repeat(501) }), vi.fn(), true)).status).toBe(413);
  });

  it("reports unavailable (not a fake answer) when no LLM is configured", async () => {
    const gen = vi.fn();
    const res = await handleInterpret(post({ message: "abc" }), gen, false);
    expect(await res.json()).toEqual({ status: "unavailable", reason: "llm not configured" });
    expect(gen).not.toHaveBeenCalled();
  });

  it("sends only the message to the model and returns the validated result", async () => {
    const gen = vi.fn(async () => '{"intent":"query_month"}');
    const res = await handleInterpret(post({ message: "dạo này tiền bạc sao rồi", balances: { secret: 1 } }), gen, true);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ status: "ok", intent: "query_month" });
    const prompt = (gen.mock.calls[0] as unknown as [string])[0];
    expect(prompt).toContain("dạo này tiền bạc sao rồi");
    expect(prompt).not.toContain("secret");
  });

  it("rate limits a client after 20 requests per minute", async () => {
    const gen = vi.fn(async () => '{"intent":"help"}');
    let last: Response | null = null;
    for (let i = 0; i < 21; i++) last = await handleInterpret(post({ message: "hi" }, "9.9.9.9"), gen, true);
    expect(last?.status).toBe(429);
  });
});
