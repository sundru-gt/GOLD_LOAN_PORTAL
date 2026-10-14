/**
 * GET /api/v1/loan-schemes
 *
 * Returns all active loan plans from the database.
 * Response fields: id, name, annualInterestRate, tenureMonths, maxLtv.
 * maxLtv is guaranteed ≤ 0.75 by DB-level validation.
 */

import { Router, Request, Response } from "express";
import { LoanScheme } from "../models/LoanScheme";
import { asyncHandler, buildError } from "../utils/errorUtils";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const plans = await LoanScheme.find({ isActive: true })
      .select("-__v")
      .sort({ annualInterestRate: 1 }) // Sort cheapest first
      .lean();

    if (!plans.length) {
      res.status(404).json(
        buildError(404, "No active loan plans found", [])
      );
      return;
    }

    res.json({
      success: true,
      count: plans.length,
      data: plans.map((p) => ({
        id: p._id,
        name: p.name,
        annualInterestRate: p.annualInterestRate,
        tenureMonths: p.tenureMonths,
        maxLtv: p.maxLtv,
        isActive: p.isActive,
      })),
    });
  })
);

export default router;
