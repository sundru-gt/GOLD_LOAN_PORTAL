/**
 * Zod Validation Schemas for Gold Loan Portal API
 *
 * All request/response shapes are defined here for type safety
 * and consistent error reporting across the application.
 */

import { z } from "zod";

// ─── Shared field schemas ──────────────────────────────────────────────────────

/**
 * Indian mobile number: starts with 6-9, exactly 10 digits.
 */
export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, {
    message: "Mobile must be a valid 10-digit Indian number starting with 6-9",
  });

/**
 * Applicant name: 2-60 characters, letters and spaces only.
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(60, { message: "Name must be at most 60 characters" })
  .regex(/^[a-zA-Z\s]+$/, {
    message: "Name must contain only letters and spaces",
  });

/**
 * Gold karat: only 18, 22, or 24.
 */
export const karatSchema = z
  .union([z.literal(18), z.literal(22), z.literal(24)], {
    errorMap: () => ({ message: "Karat must be 18, 22, or 24" }),
  });

// ─── Quote Request ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/quotes – pure calculation request.
 * No DB writes. Returns quote for all active plans.
 */
export const quoteRequestSchema = z
  .object({
    grossWeightGrams: z
      .number({ invalid_type_error: "grossWeightGrams must be a number" })
      .positive({ message: "Gross weight must be greater than 0" })
      .max(1000, { message: "Gross weight cannot exceed 1000 grams" }),

    netWeightGrams: z
      .number({ invalid_type_error: "netWeightGrams must be a number" })
      .positive({ message: "Net weight must be greater than 0" })
      .max(1000, { message: "Net weight cannot exceed 1000 grams" }),

    karat: karatSchema,
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"],
  });

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

// ─── Lead (Application) Request ───────────────────────────────────────────────

/**
 * POST /api/v1/leads – submit a new loan application.
 * Server re-computes the quote; planId selects which plan to use.
 */
export const leadRequestSchema = z
  .object({
    name: nameSchema,
    mobile: mobileSchema,

    grossWeightGrams: z
      .number({ invalid_type_error: "grossWeightGrams must be a number" })
      .positive({ message: "Gross weight must be greater than 0" })
      .max(1000, { message: "Gross weight cannot exceed 1000 grams" }),

    netWeightGrams: z
      .number({ invalid_type_error: "netWeightGrams must be a number" })
      .positive({ message: "Net weight must be greater than 0" })
      .max(1000, { message: "Net weight cannot exceed 1000 grams" }),

    karat: karatSchema,

    planId: z
      .string()
      .min(1, { message: "planId is required" })
      .regex(/^[a-f\d]{24}$/i, { message: "planId must be a valid MongoDB ObjectId" }),
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"],
  });

export type LeadRequest = z.infer<typeof leadRequestSchema>;

// ─── Leads List Query ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/leads – pagination and filter parameters.
 */
export const leadsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),

  planId: z.string().optional(),

  status: z
    .enum(["SUBMITTED", "APPROVED", "REJECTED", "DISBURSED"])
    .optional(),
});

export type LeadsQuery = z.infer<typeof leadsQuerySchema>;

// ─── Standard Error Response Shape ────────────────────────────────────────────

/**
 * All error responses follow this exact shape:
 * { "error": { "code": number, "message": string, "fields": [] } }
 */
export interface ApiError {
  error: {
    code: number;
    message: string;
    fields: { field: string; message: string }[];
  };
}
