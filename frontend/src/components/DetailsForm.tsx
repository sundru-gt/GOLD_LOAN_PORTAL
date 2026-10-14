/**
 * Step 1: Details Form Component
 *
 * Collects applicant information with live inline validation.
 * Uses numeric input mode for mobile and weights on mobile devices.
 */

import { useState, useCallback } from "react";
import { FormField, LoadingSpinner } from "./ui/index";
import { ChevronRightIcon } from "./ui/Icons";
import type { ApplicationFormData } from "../types";

// ─── Validation helpers ────────────────────────────────────────────────────────

function validateName(v: string): string {
  if (!v.trim()) return "Name is required";
  if (v.trim().length < 2) return "Name must be at least 2 characters";
  if (v.trim().length > 60) return "Name must be at most 60 characters";
  if (!/^[a-zA-Z\s]+$/.test(v)) return "Name must contain only letters and spaces";
  return "";
}

function validateMobile(v: string): string {
  if (!v) return "Mobile number is required";
  if (!/^[6-9]\d{9}$/.test(v)) return "Enter a valid 10-digit Indian mobile number";
  return "";
}

function validateGrossWeight(v: string): string {
  const n = parseFloat(v);
  if (!v || isNaN(n)) return "Gross weight is required";
  if (n <= 0) return "Gross weight must be greater than 0";
  if (n > 1000) return "Gross weight cannot exceed 1000 grams";
  return "";
}

function validateNetWeight(v: string, gross: string): string {
  const n = parseFloat(v);
  const g = parseFloat(gross);
  if (!v || isNaN(n)) return "Net weight is required";
  if (n <= 0) return "Net weight must be greater than 0";
  if (n > 1000) return "Net weight cannot exceed 1000 grams";
  if (!isNaN(g) && n > g) return "Net weight cannot exceed gross weight";
  return "";
}

function validateKarat(v: string): string {
  if (!v) return "Please select a karat";
  return "";
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface DetailsFormProps {
  formData: ApplicationFormData;
  onChange: (data: ApplicationFormData) => void;
  onNext: () => void;
  isLoading?: boolean;
}

type Touched = Record<keyof ApplicationFormData, boolean>;

export function DetailsForm({ formData, onChange, onNext, isLoading }: DetailsFormProps) {
  const [touched, setTouched] = useState<Partial<Touched>>({});

  const update = useCallback(
    (field: keyof ApplicationFormData, value: string) => {
      onChange({ ...formData, [field]: value });
    },
    [formData, onChange]
  );

  const touch = (field: keyof ApplicationFormData) => {
    setTouched((t) => ({ ...t, [field]: true }));
  };

  // Get errors (only show if touched)
  const errors = {
    name: touched.name ? validateName(formData.name) : "",
    mobile: touched.mobile ? validateMobile(formData.mobile) : "",
    grossWeightGrams: touched.grossWeightGrams
      ? validateGrossWeight(formData.grossWeightGrams)
      : "",
    netWeightGrams: touched.netWeightGrams
      ? validateNetWeight(formData.netWeightGrams, formData.grossWeightGrams)
      : "",
    karat: touched.karat ? validateKarat(formData.karat) : "",
  };

  const isFormValid =
    !validateName(formData.name) &&
    !validateMobile(formData.mobile) &&
    !validateGrossWeight(formData.grossWeightGrams) &&
    !validateNetWeight(formData.netWeightGrams, formData.grossWeightGrams) &&
    !validateKarat(formData.karat);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Touch all fields to show errors
    setTouched({
      name: true,
      mobile: true,
      grossWeightGrams: true,
      netWeightGrams: true,
      karat: true,
      planId: true,
    });
    if (isFormValid) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up" noValidate>
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Your Details</h2>
        <p className="text-sm text-slate-600">
          Tell us about yourself and your gold jewellery.
        </p>
      </div>

      {/* Name */}
      <FormField id="name" label="Full Name" error={errors.name} required>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="e.g., Rajesh Kumar"
          value={formData.name}
          onChange={(e) => update("name", e.target.value)}
          onBlur={() => touch("name")}
          className={`form-input ${errors.name ? "form-input-error" : ""}`}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </FormField>

      {/* Mobile */}
      <FormField
        id="mobile"
        label="Mobile Number"
        error={errors.mobile}
        hint="10-digit Indian mobile (starts with 6-9)"
        required
      >
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium select-none">
            +91
          </span>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            maxLength={10}
            value={formData.mobile}
            onChange={(e) => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
            onBlur={() => touch("mobile")}
            className={`form-input pl-12 ${errors.mobile ? "form-input-error" : ""}`}
          />
        </div>
      </FormField>

      {/* Weight row */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="grossWeight"
          label="Gross Weight"
          error={errors.grossWeightGrams}
          required
        >
          <div className="relative">
            <input
              id="grossWeight"
              type="number"
              inputMode="decimal"
              placeholder="12.5"
              step="0.1"
              min="0.1"
              max="1000"
              value={formData.grossWeightGrams}
              onChange={(e) => update("grossWeightGrams", e.target.value)}
              onBlur={() => {
                touch("grossWeightGrams");
                touch("netWeightGrams"); // Re-validate net on gross change
              }}
              className={`form-input pr-12 ${errors.grossWeightGrams ? "form-input-error" : ""}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
              g
            </span>
          </div>
        </FormField>

        <FormField
          id="netWeight"
          label="Net Weight"
          error={errors.netWeightGrams}
          hint="After stones/making"
          required
        >
          <div className="relative">
            <input
              id="netWeight"
              type="number"
              inputMode="decimal"
              placeholder="10.0"
              step="0.1"
              min="0.1"
              max="1000"
              value={formData.netWeightGrams}
              onChange={(e) => update("netWeightGrams", e.target.value)}
              onBlur={() => touch("netWeightGrams")}
              className={`form-input pr-12 ${errors.netWeightGrams ? "form-input-error" : ""}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
              g
            </span>
          </div>
        </FormField>
      </div>

      {/* Karat selector */}
      <FormField id="karat" label="Gold Purity (Karat)" error={errors.karat} required>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Gold karat">
          {(["18", "22", "24"] as const).map((k) => (
            <label
              key={k}
              className={`relative flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 p-3 transition-all duration-200 ${
                formData.karat === k
                  ? "border-gold-500 bg-gold-50 text-gold-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-gold-300"
              }`}
            >
              <input
                type="radio"
                name="karat"
                value={k}
                checked={formData.karat === k}
                onChange={() => {
                  update("karat", k);
                  touch("karat");
                }}
                className="sr-only"
              />
              <span className="text-xl font-bold">{k}K</span>
              <span className="text-xs mt-0.5">
                {k === "18" ? "75%" : k === "22" ? "91.6%" : "99.9%"} pure
              </span>
            </label>
          ))}
        </div>
      </FormField>

      {/* Info box */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
        <span className="text-2xl flex-shrink-0">💡</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Quick tip</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Net weight is gross weight minus stones and making charges. Check your jewellery
            invoice for the exact figure.
          </p>
        </div>
      </div>

      {/* Next button */}
      <button
        type="submit"
        id="btn-next-step1"
        className="btn-primary w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            See Loan Offers <ChevronRightIcon className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
