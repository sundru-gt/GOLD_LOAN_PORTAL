/**
 * API Client for Gold Loan Portal
 * 
 * Centralized axios instance with base URL from Vite env.
 * All API calls go through this module.
 */

import axios, { AxiosError } from "axios";
import type {
  LoanScheme,
  QuoteResponse,
  SubmitLeadResponse,
  LeadsResponse,
  ApiError,
} from "../types";

// Vite proxy routes /api → http://localhost:4000 in dev
const BASE_URL = "/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

/**
 * Extract a user-friendly error message from API error responses.
 */
export function extractApiError(err: unknown): ApiError | null {
  if (err instanceof AxiosError && err.response?.data?.error) {
    return err.response.data as ApiError;
  }
  return null;
}

// ─── Loan Schemes ─────────────────────────────────────────────────────────────

export async function fetchLoanSchemes(): Promise<LoanScheme[]> {
  const res = await api.get<{ data: LoanScheme[] }>("/loan-schemes");
  return res.data.data;
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export async function fetchQuote(params: {
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: 18 | 22 | 24;
}): Promise<QuoteResponse> {
  const res = await api.post<QuoteResponse>("/quotes", params);
  return res.data;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function submitLead(payload: {
  name: string;
  mobile: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: 18 | 22 | 24;
  planId: string;
}): Promise<SubmitLeadResponse> {
  const res = await api.post<SubmitLeadResponse>("/leads", payload);
  return res.data;
}

export async function fetchLeads(params: {
  page?: number;
  limit?: number;
  planId?: string;
  status?: string;
} = {}): Promise<LeadsResponse> {
  const res = await api.get<LeadsResponse>("/leads", { params });
  return res.data;
}

// ─── AI Agent ─────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  history: { role: string; text: string }[]
): Promise<{ reply: string; history: { role: string; text: string }[] }> {
  const res = await api.post("/agent/chat", { message, history });
  return res.data;
}
