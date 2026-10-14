/**
 * POST /api/v1/quotes
 *
 * Pure calculation endpoint – NO database writes.
 * Takes gold details and returns a quote for every active loan plan.
 *
 * Error contract: 400 with fields[] array for validation failures.
 */

import { Router, Request, Response } from "express";
import { ZodError } from "zod";
import { quoteRequestSchema } from "../schemas/validation";
import { LoanScheme } from "../models/LoanScheme";
import { computeFullQuote } from "../utils/mathUtils";
import {
  asyncHandler,
  buildError,
  zodToFieldErrors,
} from "../utils/errorUtils";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // ── 1. Validate request body ───────────────────────────────────────────
    let input;
    try {
      input = quoteRequestSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        res
          .status(400)
          .json(buildError(400, "Validation failed", zodToFieldErrors(err)));
        return;
      }
      throw err;
    }

    // ── 2. Fetch all active plans ──────────────────────────────────────────
    const plans = await LoanScheme.find({ isActive: true }).lean();

    if (!plans.length) {
      res.status(503).json(
        buildError(503, "No active loan plans available at this time", [])
      );
      return;
    }

    // ── 3. Compute quote for each plan ────────────────────────────────────
    const quotes = plans.map((plan) => {
      const { pureGoldGrams, goldValueRupees, eligibleLoanRupees } =
        computeFullQuote(input.netWeightGrams, input.karat, plan.maxLtv);

      return {
        planId: plan._id,
        planName: plan.name,
        annualInterestRate: plan.annualInterestRate,
        tenureMonths: plan.tenureMonths,
        maxLtv: plan.maxLtv,
        pureGoldGrams,
        goldValueRupees,
        eligibleLoanRupees,
      };
    });

    // ── 4. Return quotes ───────────────────────────────────────────────────
    res.json({
      success: true,
      input: {
        grossWeightGrams: input.grossWeightGrams,
        netWeightGrams: input.netWeightGrams,
        karat: input.karat,
      },
      quotes,
    });
  })
);

export default router;
