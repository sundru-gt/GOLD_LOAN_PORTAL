/**
 * Step 3: Confirm & Submit Component
 *
 * Shows review summary and handles submission.
 * Displays friendly error messages including 409 conflict handling.
 */

import { useState } from "react";
import { submitLead, extractApiError } from "../api/client";
import { formatRupees, Alert, LoadingSpinner } from "./ui/index";
import { ArrowLeftIcon, CheckIcon, SparklesIcon } from "./ui/Icons";
import type { ApplicationFormData, QuoteResult } from "../types";

interface ConfirmStepProps {
  formData: ApplicationFormData;
  selectedQuote: QuoteResult;
  onBack: () => void;
  onSuccess: (applicationId: string) => void;
}

export function ConfirmStep({
  formData,
  selectedQuote,
  onBack,
  onSuccess,
}: ConfirmStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await submitLead({
        name: formData.name,
        mobile: formData.mobile,
        grossWeightGrams: parseFloat(formData.grossWeightGrams),
        netWeightGrams: parseFloat(formData.netWeightGrams),
        karat: parseInt(formData.karat) as 18 | 22 | 24,
        planId: formData.planId,
      });

      onSuccess(response.applicationId);
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr) {
        setError(apiErr.error.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const karat = parseInt(formData.karat);

  const reviewItems = [
    { label: "Full Name", value: formData.name },
    {
      label: "Mobile",
      value: `+91 ${formData.mobile.slice(0, 4)}XXXX${formData.mobile.slice(-2)}`,
    },
    { label: "Gross Weight", value: `${formData.grossWeightGrams}g` },
    { label: "Net Weight", value: `${formData.netWeightGrams}g` },
    { label: "Gold Karat", value: `${karat}K` },
    { label: "Selected Plan", value: selectedQuote.planName },
    {
      label: "Interest Rate",
      value: `${selectedQuote.annualInterestRate}% per annum`,
    },
    { label: "Tenure", value: `${selectedQuote.tenureMonths} months` },
  ];

  const financialItems = [
    {
      label: "Pure Gold",
      value: `${selectedQuote.pureGoldGrams.toFixed(3)}g`,
      color: "text-slate-800",
    },
    {
      label: "Gold Value",
      value: formatRupees(selectedQuote.goldValueRupees),
      color: "text-amber-700",
    },
    {
      label: "Eligible Loan Amount",
      value: formatRupees(selectedQuote.eligibleLoanRupees),
      color: "text-green-700",
      highlight: true,
    },
  ];

  return (
    <div className="animate-slide-up space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Review & Confirm</h2>
        <p className="text-sm text-slate-600">
          Please review all details before submitting your application.
        </p>
      </div>

      {/* Application details */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          Application Details
        </h3>
        <div className="divide-y divide-slate-100">
          {reviewItems.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2.5">
              <span className="text-sm text-slate-500">{label}</span>
              <span className="text-sm font-semibold text-slate-800 text-right ml-4">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Financial summary */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-gold-200 p-5">
        <h3 className="text-sm font-bold text-gold-800 uppercase tracking-wide mb-4">
          💰 Loan Calculation
        </h3>
        <div className="space-y-3">
          {financialItems.map(({ label, value, color, highlight }) => (
            <div
              key={label}
              className={`flex justify-between items-center ${
                highlight
                  ? "bg-white/60 rounded-xl p-3 border border-gold-200"
                  : "px-1"
              }`}
            >
              <span className="text-sm text-slate-600">{label}</span>
              <span
                className={`font-bold ${color} ${highlight ? "text-xl" : "text-base"}`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200">
        ⚠️ The eligible loan amount is an estimate based on a 24K gold rate of ₹7,000/g.
        Final disbursement is subject to physical verification and credit policy. This is
        not a guarantee of approval.
      </div>

      {/* Error (including 409 conflict) */}
      {error && (
        <Alert
          type="error"
          title="Application Error"
          message={error}
          className="animate-fade-in"
        />
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          id="btn-back-step3"
          onClick={onBack}
          className="btn-secondary flex-1"
          disabled={isSubmitting}
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          id="btn-submit-application"
          onClick={handleSubmit}
          className="btn-primary flex-[2]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" /> Submitting...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" /> Submit Application
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

interface SuccessScreenProps {
  applicationId: string;
  onStartNew: () => void;
}

export function SuccessScreen({ applicationId, onStartNew }: SuccessScreenProps) {
  return (
    <div className="text-center space-y-6 animate-slide-up py-4">
      {/* Checkmark animation */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40">
        <CheckIcon className="w-12 h-12 text-white" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
        <p className="text-slate-600">
          Your gold loan application has been received. We'll process it shortly.
        </p>
      </div>

      {/* Application ID */}
      <div className="bg-gradient-to-br from-gold-50 to-amber-50 border-2 border-gold-200 rounded-2xl p-6">
        <p className="text-sm text-gold-700 font-semibold uppercase tracking-wide mb-2">
          Application ID
        </p>
        <p
          className="text-3xl font-black text-gradient-gold tracking-wider"
          id="application-id-display"
        >
          {applicationId}
        </p>
        <p className="text-xs text-slate-500 mt-3">
          Please save this ID for tracking your application status.
        </p>
      </div>

      {/* What's next */}
      <div className="text-left glass-card p-5 space-y-3">
        <p className="font-semibold text-slate-800">What happens next?</p>
        {[
          "Our team will review your application within 2-4 hours.",
          "You'll receive an SMS on your registered mobile number.",
          "Visit your nearest branch with your gold for assessment.",
        ].map((step, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-gold-100 text-gold-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <p className="text-sm text-slate-600">{step}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        id="btn-new-application"
        onClick={onStartNew}
        className="btn-primary w-full"
      >
        Start New Application
      </button>
    </div>
  );
}
