/**
 * Gold Loan Math Utilities
 *
 * All financial calculations are performed here.
 * The LLM MUST NOT perform arithmetic; it calls these via backend tools.
 *
 * Rules:
 *  - pureGoldGrams = netWeightGrams × (karat / 24)
 *  - goldValue     = pureGoldGrams × GOLD_RATE_PER_GRAM (default ₹7,000/g)
 *  - eligibleLoan  = floor(goldValue × min(plan.maxLtv, 0.75))
 *  - Money values are stored/returned as WHOLE RUPEES (integers), never floats.
 */

/** Mock 24K gold rate in INR per gram (overridable via env). */
export const GOLD_RATE_PER_GRAM = Number(process.env.GOLD_RATE_PER_GRAM) || 7000;

/** Maximum allowed LTV across all plans (hard business rule). */
export const MAX_LTV_CAP = 0.75;

/**
 * Compute pure gold weight from net weight and karat.
 *
 * @param netWeightGrams  - Net weight of gold ornament in grams
 * @param karat           - Gold purity (18 | 22 | 24)
 * @returns               - Pure gold in grams (up to 6 decimal places)
 */
export function computePureGoldGrams(
  netWeightGrams: number,
  karat: 18 | 22 | 24
): number {
  if (netWeightGrams <= 0) {
    throw new RangeError("netWeightGrams must be positive");
  }
  if (![18, 22, 24].includes(karat)) {
    throw new RangeError("karat must be 18, 22, or 24");
  }
  // Round to 6 decimal places to avoid floating-point drift
  return parseFloat(((netWeightGrams * karat) / 24).toFixed(6));
}

/**
 * Compute gold value in whole rupees.
 *
 * @param pureGoldGrams  - Pure 24K gold weight in grams
 * @param ratePerGram    - Gold price per gram (defaults to GOLD_RATE_PER_GRAM)
 * @returns              - Gold value as an integer (whole rupees)
 */
export function computeGoldValueRupees(
  pureGoldGrams: number,
  ratePerGram: number = GOLD_RATE_PER_GRAM
): number {
  if (pureGoldGrams < 0) {
    throw new RangeError("pureGoldGrams must be non-negative");
  }
  // Math.round to nearest rupee (not floor/ceil) for gold value
  return Math.round(pureGoldGrams * ratePerGram);
}

/**
 * Compute eligible loan amount in whole rupees.
 * Applies the hard cap of 75% LTV regardless of plan setting.
 *
 * @param goldValueRupees - Gold value in whole rupees
 * @param planMaxLtv      - Plan's maximum LTV (decimal, e.g. 0.65)
 * @returns               - Eligible loan as integer rupees (floor)
 */
export function computeEligibleLoanRupees(
  goldValueRupees: number,
  planMaxLtv: number
): number {
  if (goldValueRupees < 0) {
    throw new RangeError("goldValueRupees must be non-negative");
  }
  // Business rule: effective LTV = min(planMaxLtv, 0.75)
  const effectiveLtv = Math.min(planMaxLtv, MAX_LTV_CAP);
  // floor() ensures we never lend more than allowed
  return Math.floor(goldValueRupees * effectiveLtv);
}

/**
 * Full quote calculation for a single plan.
 *
 * @param netWeightGrams   - Net gold weight in grams
 * @param karat            - Gold purity (18 | 22 | 24)
 * @param planMaxLtv       - Plan's maximum LTV
 * @param ratePerGram      - Gold price per gram (optional override)
 */
export function computeFullQuote(
  netWeightGrams: number,
  karat: 18 | 22 | 24,
  planMaxLtv: number,
  ratePerGram: number = GOLD_RATE_PER_GRAM
): {
  pureGoldGrams: number;
  goldValueRupees: number;
  eligibleLoanRupees: number;
} {
  const pureGoldGrams = computePureGoldGrams(netWeightGrams, karat);
  const goldValueRupees = computeGoldValueRupees(pureGoldGrams, ratePerGram);
  const eligibleLoanRupees = computeEligibleLoanRupees(goldValueRupees, planMaxLtv);

  return { pureGoldGrams, goldValueRupees, eligibleLoanRupees };
}

/**
 * Mask a mobile number for safe display/logging.
 * Example: 9876543210 → 9876XXXX10
 *
 * @param mobile - Raw 10-digit mobile number
 * @returns      - Masked version safe for logs and API responses
 */
export function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 10) return "XXXXXXXXXX";
  return `${mobile.slice(0, 4)}XXXX${mobile.slice(-2)}`;
}

/**
 * Generate a sequential Application ID.
 * Format: GL-<timestamp-suffix> for collision-resistance in production.
 * In real production this would use a DB sequence or UUID.
 *
 * @param suffix - Optional numeric suffix from DB count
 */
export function generateApplicationId(count: number): string {
  return `GL-${1000 + count}`;
}
