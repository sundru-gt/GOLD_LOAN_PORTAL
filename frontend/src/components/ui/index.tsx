/**
 * Reusable UI Components for Gold Loan Portal
 */

import React from "react";
import { CheckIcon, ExclamationCircleIcon } from "./Icons";

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ id, label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="text-gold-600 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="field-error animate-fade-in" role="alert">
          <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
    </div>
  );
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: SpinnerProps) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return (
    <div
      className={`${sizes[size]} border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-slate-200 p-5 space-y-3">
      <div className="skeleton h-5 w-1/3" />
      <div className="skeleton h-4 w-2/3" />
      <div className="flex gap-2">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-8 w-1/3" />
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8" aria-label="Application steps">
      {steps.map((step, i) => {
        const idx = i + 1;
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={
                  isDone
                    ? "step-done"
                    : isActive
                    ? "step-active"
                    : "step-pending"
                }
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <CheckIcon className="w-5 h-5" /> : <span>{idx}</span>}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive ? "text-gold-700" : isDone ? "text-green-700" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-4 transition-colors duration-300 ${
                  idx < currentStep ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Currency formatter ───────────────────────────────────────────────────────

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatRupees(amount: number): string {
  return rupeeFormatter.format(amount);
}

// ─── Alert / Notification ─────────────────────────────────────────────────────

interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  className?: string;
}

const alertStyles = {
  success: "bg-green-50 border-green-300 text-green-800",
  error: "bg-red-50 border-red-300 text-red-800",
  warning: "bg-amber-50 border-amber-300 text-amber-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

export function Alert({ type, title, message, className = "" }: AlertProps) {
  return (
    <div
      className={`border-l-4 px-4 py-3 rounded-lg ${alertStyles[type]} ${className} animate-fade-in`}
      role="alert"
    >
      {title && <p className="font-semibold text-sm mb-1">{title}</p>}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const badgeMap = {
  SUBMITTED: "badge-submitted",
  APPROVED: "badge-approved",
  REJECTED: "badge-rejected",
  DISBURSED: "badge-disbursed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={badgeMap[status as keyof typeof badgeMap] || "badge bg-slate-100 text-slate-700"}>
      {status}
    </span>
  );
}
