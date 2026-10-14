/**
 * TypeScript types for the Gold Loan Portal frontend.
 * Mirrors the backend schemas for type safety.
 */

// ─── Loan Scheme ──────────────────────────────────────────────────────────────

export interface LoanScheme {
  id: string;
  name: string;
  annualInterestRate: number;
  tenureMonths: number;
  maxLtv: number; // e.g. 0.75 = 75%
  isActive: boolean;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export interface QuoteResult {
  planId: string;
  planName: string;
  annualInterestRate: number;
  tenureMonths: number;
  maxLtv: number;
  pureGoldGrams: number;
  goldValueRupees: number;
  eligibleLoanRupees: number;
}

export interface QuoteResponse {
  success: boolean;
  input: {
    grossWeightGrams: number;
    netWeightGrams: number;
    karat: 18 | 22 | 24;
  };
  quotes: QuoteResult[];
}

// ─── Lead ─────────────────────────────────────────────────────────────────────

export type LeadStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "DISBURSED";

export interface LeadSummary {
  applicationId: string;
  name: string;
  mobile: string; // Always masked in API responses
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: 18 | 22 | 24;
  planName: string;
  pureGoldGrams: number;
  goldValueRupees: number;
  loanAmountRupees: number;
  status: LeadStatus;
  createdAt: string;
}

export interface LeadsResponse {
  success: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  data: LeadSummary[];
}

export interface SubmitLeadResponse {
  success: boolean;
  applicationId: string;
  data: LeadSummary;
}

// ─── Form State ───────────────────────────────────────────────────────────────

export interface ApplicationFormData {
  name: string;
  mobile: string;
  grossWeightGrams: string; // String for controlled input
  netWeightGrams: string;
  karat: "" | "18" | "22" | "24";
  planId: string;
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  error: {
    code: number;
    message: string;
    fields: FieldError[];
  };
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}
