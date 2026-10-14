/**
 * Admin View Component
 *
 * Table showing all leads newest first with:
 * - Masked mobile numbers
 * - Plan filter and status filter
 * - Pagination
 */

import { useEffect, useState, useCallback } from "react";
import { fetchLeads, fetchLoanSchemes } from "../api/client";
import { formatRupees, LoadingSpinner, StatusBadge, Alert } from "./ui/index";
import { RefreshIcon, FilterIcon } from "./ui/Icons";
import type { LeadSummary, LoanScheme } from "../types";

export function AdminView() {
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [schemes, setSchemes] = useState<LoanScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState({
    planId: "",
    status: "",
  });

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchLeads({
        page: pagination.page,
        limit: pagination.limit,
        planId: filters.planId || undefined,
        status: filters.status || undefined,
      });
      setLeads(data.data);
      setPagination((p) => ({ ...p, ...data.pagination }));
    } catch {
      setError("Failed to load applications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Load schemes for filter dropdown
  useEffect(() => {
    fetchLoanSchemes()
      .then(setSchemes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Reset to page 1 when filters change
  const applyFilter = (key: "planId" | "status", value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">All Applications</h2>
          <p className="text-sm text-slate-600">
            {pagination.total} total application{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          id="btn-admin-refresh"
          onClick={loadLeads}
          className="btn-secondary self-start sm:self-auto"
          disabled={isLoading}
        >
          <RefreshIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filters:</span>
        </div>

        {/* Plan filter */}
        <select
          id="filter-plan"
          value={filters.planId}
          onChange={(e) => applyFilter("planId", e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400"
        >
          <option value="">All Plans</option>
          {schemes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) => applyFilter("status", e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          {["SUBMITTED", "APPROVED", "REJECTED", "DISBURSED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {(filters.planId || filters.status) && (
          <button
            onClick={() => {
              setFilters({ planId: "", status: "" });
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && <Alert type="error" message={error} />}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Table */}
      {!isLoading && leads.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm" aria-label="Loan applications">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  "App ID",
                  "Date",
                  "Name",
                  "Mobile",
                  "Net Wt",
                  "Karat",
                  "Plan",
                  "Loan Amount",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead, i) => (
                <tr
                  key={lead.applicationId}
                  className={`transition-colors hover:bg-amber-50/50 ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-gold-700 whitespace-nowrap">
                    {lead.applicationId}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                    {lead.mobile}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {lead.netWeightGrams}g
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {lead.karat}K
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {lead.planName}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">
                    {formatRupees(lead.loanAmountRupees)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && leads.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-semibold text-slate-600">No applications found</p>
          <p className="text-sm mt-1">
            {filters.planId || filters.status
              ? "Try changing your filters"
              : "Applications will appear here once submitted"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              id="btn-prev-page"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={!pagination.hasPrevPage}
              className="btn-secondary py-2 px-3 text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-sm font-medium text-slate-700">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              id="btn-next-page"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={!pagination.hasNextPage}
              className="btn-secondary py-2 px-3 text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
