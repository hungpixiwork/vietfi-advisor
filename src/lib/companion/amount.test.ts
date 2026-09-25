import { describe, expect, it } from "vitest";
import { findAmounts, parseAmount } from "./amount";

describe("parseAmount — Vietnamese money expressions", () => {
  it.each([
    ["30k", 30_000],
    ["30K", 30_000],
    ["30 nghìn", 30_000],
    ["30 ngàn", 30_000],
    ["30 nghin", 30_000],
    ["ba chục", 30_000],
    ["năm chục", 50_000],
    ["5 chục", 50_000],
    ["1tr2", 1_200_000],
    ["3tr5", 3_500_000],
    ["1tr25", 1_250_000],
    ["1,2 triệu", 1_200_000],
    ["1.5tr", 1_500_000],
    ["2 triệu", 2_000_000],
    ["1 triệu rưỡi", 1_500_000],
    ["1.200.000đ", 1_200_000],
    ["1,200,000", 1_200_000],
    ["25.000 đồng", 25_000],
    ["25000", 25_000],
    ["25000đ", 25_000],
    ["hai trăm nghìn", 200_000],
    ["2 trăm rưỡi", 250_000],
    ["1.5k", 1_500],
    ["800đ", 800],
    ["1 tỷ", 1_000_000_000],
  ])("%s → %d", (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it("flags a bare number as an assumption instead of silently guessing", () => {
    const [m] = findAmounts("phở 35");
    expect(m.amount).toBe(35_000);
    expect(m.assumption).toMatch(/35\.000đ/);
  });

  it("does not treat quantities or times as money", () => {
    expect(findAmounts("3 trà sữa 90k").map((a) => a.amount)).toEqual([90_000]);
    expect(findAmounts("lúc 7 giờ ăn phở 30k").map((a) => a.amount)).toEqual([30_000]);
    expect(findAmounts("2 ly cà phê 50k").map((a) => a.amount)).toEqual([50_000]);
  });

  it("does not read letters inside words as units", () => {
    // "tr" in "trà", "m" in "mì", "k" in "kem" must not become units
    expect(findAmounts("trà sữa").length).toBe(0);
    expect(findAmounts("mì gói").length).toBe(0);
    expect(findAmounts("ăn kem").length).toBe(0);
  });

  it("finds several amounts with their positions", () => {
    const found = findAmounts("phở 35k, cà phê 25k");
    expect(found.map((a) => a.amount)).toEqual([35_000, 25_000]);
    expect(found[0].start).toBeLessThan(found[1].start);
  });

  it("returns null when there is no amount, and rejects absurd values", () => {
    expect(parseAmount("hôm nay tiêu bao nhiêu")).toBeNull();
    expect(parseAmount("100 tỷ")).toBeNull(); // above the 10 tỷ ceiling
    expect(parseAmount("200đ")).toBeNull(); // below 500đ minimum
  });
});
