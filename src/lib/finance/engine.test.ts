import { describe, it, expect } from "vitest";
import {
  analyzeFinancialHealth,
  simulateFinancialDecision,
  FinancialProfileInput,
  DecisionScenarioInput,
} from "./engine";

describe("Deterministic Finance Engine", () => {
  const mockProfile: FinancialProfileInput = {
    monthlyIncome: 18_000_000,
    monthlyExpense: 11_000_000,
    currentCash: 35_000_000,
    totalDebt: 8_000_000,
    monthlyDebtPayment: 2_000_000,
  };

  it("calculates baseline financial health correctly", () => {
    const health = analyzeFinancialHealth(mockProfile);

    // Surplus = 18m - 11m - 2m = 5m
    expect(health.monthlySurplus).toBe(5_000_000);
    // Savings rate = 5m / 18m = ~28%
    expect(health.savingsRate).toBe(28);
    // Emergency fund = 35m / 11m = ~3.2 months
    expect(health.emergencyFundMonths).toBe(3.2);
    expect(health.emergencyFundStatus).toBe("HEALTHY");
    // DTI = 2m / 18m = 11.1%
    expect(health.dtiRatio).toBe(11.1);
    expect(health.dtiStatus).toBe("SAFE");
    expect(health.healthScore).toBeGreaterThan(60);
  });

  it("simulates full cash purchase of 25m laptop (Scenario 1)", () => {
    const scenario: DecisionScenarioInput = {
      title: "Mua Laptop Dell XPS 25tr",
      costAmount: 25_000_000,
      paymentMethod: "FULL_CASH",
    };

    const sim = simulateFinancialDecision(mockProfile, scenario);

    expect(sim.before.cash).toBe(35_000_000);
    expect(sim.after.cash).toBe(10_000_000); // 35m - 25m
    expect(sim.before.emergencyFundMonths).toBe(3.2);
    // 10m / 11m = 0.9 months
    expect(sim.after.emergencyFundMonths).toBe(0.9);
    // Risk flag should warn about emergency fund depletion
    expect(sim.riskFlags.some((f) => f.includes("quỹ dự phòng"))).toBe(true);
    expect(sim.verdict.level).toMatch(/NOT_RECOMMENDED|DANGEROUS/);
  });

  it("simulates 12-month installment purchase of 25m laptop (Scenario 2)", () => {
    const scenario: DecisionScenarioInput = {
      title: "Trả góp Laptop 25tr trong 12 tháng",
      costAmount: 25_000_000,
      paymentMethod: "INSTALLMENT_12M",
      interestRateAnnualPct: 0, // 0% fee
    };

    const sim = simulateFinancialDecision(mockProfile, scenario);

    expect(sim.before.cash).toBe(35_000_000);
    expect(sim.after.cash).toBe(35_000_000); // cash preserved
    // Monthly addon = 25m / 12 = ~2,083,333
    expect(sim.monthlyPaymentAddon).toBe(2_083_333);
    // Monthly debt payment goes from 2m to ~4.08m
    // DTI = 4.08m / 18m = ~22.7%
    expect(sim.after.dtiRatio).toBeGreaterThan(22);
    // Monthly surplus drops from 5m to ~2.92m
    expect(sim.after.monthlySurplus).toBeLessThan(3_000_000);
  });
});
