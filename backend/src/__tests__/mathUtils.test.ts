/**
 * Unit Tests – Gold Loan Math Utilities
 *
 * Tests every calculation function with edge cases.
 * These tests catch the class of bugs where floats produce wrong integers.
 *
 * AI_LOG Note: The AI initially suggested using Math.round() for eligibleLoan.
 * This test caught that bug – floor() must be used to never over-lend.
 */

import {
  computePureGoldGrams,
  computeGoldValueRupees,
  computeEligibleLoanRupees,
  computeFullQuote,
  maskMobile,
  generateApplicationId,
  GOLD_RATE_PER_GRAM,
  MAX_LTV_CAP,
} from "../utils/mathUtils";

describe("computePureGoldGrams", () => {
  test("22K gold: 10g net → 9.166667g pure", () => {
    const result = computePureGoldGrams(10, 22);
    expect(result).toBeCloseTo(9.166667, 5);
  });

  test("18K gold: 20g net → 15g pure", () => {
    const result = computePureGoldGrams(20, 18);
    expect(result).toBeCloseTo(15.0, 5);
  });

  test("24K gold: 10g net → 10g pure", () => {
    const result = computePureGoldGrams(10, 24);
    expect(result).toBe(10.0);
  });

  test("18K gold: 7g net → 5.25g pure", () => {
    const result = computePureGoldGrams(7, 18);
    expect(result).toBeCloseTo(5.25, 5);
  });

  test("throws RangeError for zero weight", () => {
    expect(() => computePureGoldGrams(0, 22)).toThrow(RangeError);
  });

  test("throws RangeError for negative weight", () => {
    expect(() => computePureGoldGrams(-5, 22)).toThrow(RangeError);
  });

  test("throws RangeError for invalid karat", () => {
    // @ts-ignore - testing runtime validation with invalid input
    expect(() => computePureGoldGrams(10, 20)).toThrow(RangeError);
  });
});

describe("computeGoldValueRupees", () => {
  test("returns whole rupees (integer)", () => {
    const value = computeGoldValueRupees(10, 7000);
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBe(70000);
  });

  test("rounds to nearest rupee", () => {
    // 9.166667g * 7000 = 64166.669 → 64167
    const value = computeGoldValueRupees(9.166667, 7000);
    expect(value).toBe(64167);
  });

  test("uses default GOLD_RATE_PER_GRAM", () => {
    const value = computeGoldValueRupees(1);
    expect(value).toBe(GOLD_RATE_PER_GRAM);
  });

  test("returns 0 for 0 grams", () => {
    expect(computeGoldValueRupees(0, 7000)).toBe(0);
  });

  test("throws for negative grams", () => {
    expect(() => computeGoldValueRupees(-1, 7000)).toThrow(RangeError);
  });
});

describe("computeEligibleLoanRupees", () => {
  test("uses floor() – NEVER rounds up (AI bug caught by this test)", () => {
    // 64167 * 0.65 = 41708.55 → should be 41708 (floor), NOT 41709 (round)
    const result = computeEligibleLoanRupees(64167, 0.65);
    expect(result).toBe(41708); // Floor, not round
  });

  test("applies hard 75% LTV cap even if plan allows more", () => {
    // Hypothetical plan with 80% LTV – should be capped at 75%
    const result = computeEligibleLoanRupees(100000, 0.80);
    expect(result).toBe(75000); // Capped at MAX_LTV_CAP (0.75)
  });

  test("75% plan: 100000 → 75000", () => {
    const result = computeEligibleLoanRupees(100000, MAX_LTV_CAP);
    expect(result).toBe(75000);
  });

  test("60% plan: 70000 → 42000", () => {
    const result = computeEligibleLoanRupees(70000, 0.6);
    expect(result).toBe(42000);
  });

  test("throws for negative gold value", () => {
    expect(() => computeEligibleLoanRupees(-1, 0.75)).toThrow(RangeError);
  });

  test("returns 0 for 0 gold value", () => {
    expect(computeEligibleLoanRupees(0, 0.75)).toBe(0);
  });
});

describe("computeFullQuote", () => {
  test("end-to-end: 22K 10g net, 0.65 LTV", () => {
    // pureGold = 10 * (22/24) = 9.166667g
    // goldValue = 9.166667 * 7000 = 64167 (rounded)
    // loan     = floor(64167 * 0.65) = floor(41708.55) = 41708
    const result = computeFullQuote(10, 22, 0.65);
    expect(result.pureGoldGrams).toBeCloseTo(9.166667, 4);
    expect(result.goldValueRupees).toBe(64167);
    expect(result.eligibleLoanRupees).toBe(41708);
  });

  test("18K 20g net, 0.75 LTV (max)", () => {
    // pureGold = 20 * (18/24) = 15g
    // goldValue = 15 * 7000 = 105000
    // loan     = floor(105000 * 0.75) = 78750
    const result = computeFullQuote(20, 18, 0.75);
    expect(result.pureGoldGrams).toBe(15.0);
    expect(result.goldValueRupees).toBe(105000);
    expect(result.eligibleLoanRupees).toBe(78750);
  });

  test("24K 5g net, 0.60 LTV", () => {
    // pureGold = 5g
    // goldValue = 5 * 7000 = 35000
    // loan = floor(35000 * 0.60) = 21000
    const result = computeFullQuote(5, 24, 0.60);
    expect(result.goldValueRupees).toBe(35000);
    expect(result.eligibleLoanRupees).toBe(21000);
  });
});

describe("maskMobile", () => {
  test("masks middle digits: 9876543210 → 9876XXXX10", () => {
    expect(maskMobile("9876543210")).toBe("9876XXXX10");
  });

  test("masks 6-starting number: 6543219870 → 6543XXXX70", () => {
    expect(maskMobile("6543219870")).toBe("6543XXXX70");
  });

  test("handles short strings gracefully", () => {
    expect(maskMobile("123")).toBe("XXXXXXXXXX");
  });

  test("handles empty string", () => {
    expect(maskMobile("")).toBe("XXXXXXXXXX");
  });
});

describe("generateApplicationId", () => {
  test("first application is GL-1001", () => {
    expect(generateApplicationId(1)).toBe("GL-1001");
  });

  test("100th application is GL-1100", () => {
    expect(generateApplicationId(100)).toBe("GL-1100");
  });

  test("always starts with GL-", () => {
    const id = generateApplicationId(42);
    expect(id).toMatch(/^GL-\d+$/);
  });
});
