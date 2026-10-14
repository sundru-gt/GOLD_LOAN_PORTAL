/**
 * Step 2: Live Quote Component
 *
 * Auto-fetches quotes with 300ms debounce as user types.
 * Displays selectable plan cards with key financial details.
 */

import { useEffect, useRef, useState } from "react";
import { fetchQuote } from "../api/client";
import { SkeletonCard, formatRupees, Alert } from "./ui/index";
import { ArrowLeftIcon, ChevronRightIcon } from "./ui/Icons";
import type { ApplicationFormData, QuoteResult } from "../types";

interface LiveQuoteProps {
  formData: ApplicationFormData;
  onChange: (data: ApplicationFormData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LiveQuote({ formData, onChange, onNext, onBack }: LiveQuoteProps) {
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gross = parseFloat(formData.grossWeightGrams);
  const net = parseFloat(formData.netWeightGrams);
  const karat = parseInt(formData.karat) as 18 | 22 | 24;

  // ── Debounced quote fetch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!gross || !net || !karat || isNaN(gross) || isNaN(net) || net > gross) {
      setQuotes([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await fetchQuote({ grossWeightGrams: gross, netWeightGrams: net, karat });
        setQuotes(data.quotes);
      } catch {
        setError("Unable to fetch quotes. Please try again.");
        setQuotes([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [gross, net, karat]);

  const selectedQuote = quotes.find((q) => q.planId === formData.planId);

  const handleSelect = (quote: QuoteResult) => {
    onChange({ ...formData, planId: quote.planId });
  };

  const handleNext = () => {
    if (!formData.planId) {
      setError("Please select a loan plan to continue.");
      return;
    }
    onNext();
  };

  return (
    <div className="animate-slide-up space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Choose Your Plan</h2>
        <p className="text-sm text-slate-600">
          Select the loan plan that best suits your needs.
        </p>
      </div>

      {/* Gold summary pill */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Gross", value: `${gross}g` },
          { label: "Net", value: `${net}g` },
          { label: "Karat", value: `${karat}K` },
        ].map(({ label, value }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 bg-gold-100 text-gold-800 text-xs font-semibold px-3 py-1.5 rounded-full"
          >
            <span className="text-gold-600">{label}:</span> {value}
          </span>
        ))}
      </div>

      {/* Error */}
      {error && <Alert type="error" message={error} />}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Plan cards */}
      {!isLoading && quotes.length > 0 && (
        <div className="space-y-3" role="radiogroup" aria-label="Loan plans">
          {quotes.map((quote) => {
            const isSelected = formData.planId === quote.planId;
            return (
              <div
                key={quote.planId}
                className={`plan-card ${isSelected ? "plan-card-selected" : ""}`}
                onClick={() => handleSelect(quote)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleSelect(quote)}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{quote.planName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {quote.tenureMonths} month{quote.tenureMonths > 1 ? "s" : ""} •{" "}
                      <span className="text-gold-700 font-semibold">{quote.annualInterestRate}% p.a.</span>
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-gold-500 border-gold-500"
                        : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                      Pure Gold
                    </p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {quote.pureGoldGrams.toFixed(2)}g
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">
                      Gold Value
                    </p>
                    <p className="text-sm font-bold text-amber-800 mt-0.5">
                      {formatRupees(quote.goldValueRupees)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-green-600 font-semibold">
                      Eligible Loan
                    </p>
                    <p className="text-sm font-bold text-green-800 mt-0.5">
                      {formatRupees(quote.eligibleLoanRupees)}
                    </p>
                  </div>
                </div>

                {/* LTV badge */}
                <div className="mt-2 flex items-center gap-1.5">
                  <div
                    className="h-1.5 rounded-full bg-slate-200 flex-1 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full"
                      style={{ width: `${quote.maxLtv * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {(quote.maxLtv * 100).toFixed(0)}% LTV
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No quotes (shouldn't happen normally) */}
      {!isLoading && quotes.length === 0 && !error && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-4xl mb-2">📊</p>
          <p>Fetching available plans...</p>
        </div>
      )}

      {/* Selected plan summary bar */}
      {selectedQuote && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-green-700">Selected Plan</p>
            <p className="font-bold text-green-900">{selectedQuote.planName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-700">Eligible Loan</p>
            <p className="text-xl font-bold text-green-800">
              {formatRupees(selectedQuote.eligibleLoanRupees)}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          id="btn-back-step2"
          onClick={onBack}
          className="btn-secondary flex-1"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          id="btn-next-step2"
          onClick={handleNext}
          className="btn-primary flex-[2]"
          disabled={!formData.planId || isLoading}
        >
          Review Application <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
