/**
 * POST /api/v1/leads  – Submit a new loan application
 * GET  /api/v1/leads  – Fetch all leads (paginated, newest first, masked mobile)
 *
 * Business Rules:
 *  - Server re-computes the quote (never trusts client-side values)
 *  - Duplicate detection: same mobile within 7 days → 409 Conflict
 *  - Mobile numbers are MASKED in all GET responses (9876XXXX10 format)
 *  - Money values stored/returned as whole rupees (integers)
 */

import { Router, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { leadRequestSchema, leadsQuerySchema } from "../schemas/validation";
import { LoanScheme } from "../models/LoanScheme";
import { Lead } from "../models/Lead";
import { computeFullQuote, maskMobile, generateApplicationId } from "../utils/mathUtils";
import {
  asyncHandler,
  buildError,
  zodToFieldErrors,
} from "../utils/errorUtils";

const router = Router();

// ─── POST /api/v1/leads ────────────────────────────────────────────────────────

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // ── 1. Validate request body ───────────────────────────────────────────
    let input;
    try {
      input = leadRequestSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        res
          .status(400)
          .json(buildError(400, "Validation failed", zodToFieldErrors(err)));
        return;
      }
      throw err;
    }

    // ── 2. Check for duplicate mobile within 7 days ────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const existingLead = await Lead.findOne({
      mobile: input.mobile,
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existingLead) {
      const appliedDate = new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(existingLead.createdAt));

      res.status(409).json(
        buildError(
          409,
          `You already applied on ${appliedDate}, application ${existingLead.applicationId}`,
          [{ field: "mobile", message: "Duplicate application within 7 days" }]
        )
      );
      return;
    }

    // ── 3. Fetch and validate the selected plan ────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(input.planId)) {
      res
        .status(400)
        .json(buildError(400, "Invalid planId", [{ field: "planId", message: "Not a valid plan ID" }]));
      return;
    }

    const plan = await LoanScheme.findById(input.planId).lean();
    if (!plan || !plan.isActive) {
      res.status(400).json(
        buildError(400, "Selected plan is not available", [
          { field: "planId", message: "Plan not found or inactive" },
        ])
      );
      return;
    }

    // ── 4. SERVER-SIDE re-computation of quote ────────────────────────────
    // We never trust client-provided loan amounts.
    const { pureGoldGrams, goldValueRupees, eligibleLoanRupees } =
      computeFullQuote(input.netWeightGrams, input.karat, plan.maxLtv);

    // ── 5. Generate application ID ─────────────────────────────────────────
    const totalLeads = await Lead.countDocuments();
    const applicationId = generateApplicationId(totalLeads + 1);

    // ── 6. Persist the lead ────────────────────────────────────────────────
    const lead = await Lead.create({
      applicationId,
      name: input.name,
      mobile: input.mobile, // Stored raw; masked at API layer
      grossWeightGrams: input.grossWeightGrams,
      netWeightGrams: input.netWeightGrams,
      karat: input.karat,
      planId: plan._id,
      planName: plan.name,
      pureGoldGrams,
      goldValueRupees,
      loanAmountRupees: eligibleLoanRupees,
      status: "SUBMITTED",
    });

    // ── 7. Return 201 with applicationId ─────────────────────────────────
    res.status(201).json({
      success: true,
      applicationId: lead.applicationId,
      data: {
        applicationId: lead.applicationId,
        name: lead.name,
        mobile: maskMobile(lead.mobile), // Never return unmasked mobile
        planName: lead.planName,
        pureGoldGrams: lead.pureGoldGrams,
        goldValueRupees: lead.goldValueRupees,
        loanAmountRupees: lead.loanAmountRupees,
        status: lead.status,
        createdAt: lead.createdAt,
      },
    });
  })
);

// ─── GET /api/v1/leads ─────────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // ── 1. Validate query params ───────────────────────────────────────────
    let query;
    try {
      query = leadsQuerySchema.parse(req.query);
    } catch (err) {
      if (err instanceof ZodError) {
        res
          .status(400)
          .json(buildError(400, "Invalid query parameters", zodToFieldErrors(err)));
        return;
      }
      throw err;
    }

    const { page, limit, planId, status } = query;
    const skip = (page - 1) * limit;

    // ── 2. Build filter ────────────────────────────────────────────────────
    const filter: Record<string, unknown> = {};
    if (planId && mongoose.Types.ObjectId.isValid(planId)) {
      filter.planId = new mongoose.Types.ObjectId(planId);
    }
    if (status) {
      filter.status = status;
    }

    // ── 3. Query leads, newest first ───────────────────────────────────────
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    // ── 4. Mask mobile numbers before returning ────────────────────────────
    const maskedLeads = leads.map((l) => ({
      applicationId: l.applicationId,
      name: l.name,
      mobile: maskMobile(l.mobile), // IMPORTANT: always mask
      grossWeightGrams: l.grossWeightGrams,
      netWeightGrams: l.netWeightGrams,
      karat: l.karat,
      planName: l.planName,
      pureGoldGrams: l.pureGoldGrams,
      goldValueRupees: l.goldValueRupees,
      loanAmountRupees: l.loanAmountRupees,
      status: l.status,
      createdAt: l.createdAt,
    }));

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      data: maskedLeads,
    });
  })
);

export default router;
