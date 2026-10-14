/**
 * Main Application Component
 *
 * Orchestrates the 3-step loan application flow:
 *   Step 1: Details Form
 *   Step 2: Live Quote (plan selection)
 *   Step 3: Confirm & Submit → Success
 *
 * Also provides Admin and AI Chat tabs.
 */

import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StepIndicator } from "./components/ui/index";
import { DetailsForm } from "./components/DetailsForm";
import { LiveQuote } from "./components/LiveQuote";
import { ConfirmStep, SuccessScreen } from "./components/ConfirmStep";
import { AdminView } from "./components/AdminView";
import { AiChat } from "./components/AiChat";
import { fetchQuote } from "./api/client";
import type { ApplicationFormData, QuoteResult } from "./types";

type Tab = "apply" | "admin" | "chat";
type Step = 1 | 2 | 3 | 4; // 4 = success

const INITIAL_FORM: ApplicationFormData = {
  name: "",
  mobile: "",
  grossWeightGrams: "",
  netWeightGrams: "",
  karat: "",
  planId: "",
};

const STEPS = ["Details", "Choose Plan", "Confirm"];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("apply");
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<ApplicationFormData>(INITIAL_FORM);
  const [selectedQuote, setSelectedQuote] = useState<QuoteResult | null>(null);
  const [applicationId, setApplicationId] = useState("");

  // When switching to a different tab, find the selected quote from formData
  const getSelectedQuote = () => {
    return selectedQuote;
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleFormChange = (data: ApplicationFormData) => {
    setFormData(data);
    // Clear selected quote if plan changed
    if (data.planId !== formData.planId) {
      setSelectedQuote(null);
    }
  };

  const handleStep2Next = () => {
    // Capture the selected quote before moving to confirm
    setStep(3);
  };

  const handleQuoteChange = (data: ApplicationFormData) => {
    setFormData(data);
  };

  const handleSuccess = (appId: string) => {
    setApplicationId(appId);
    setStep(4);
  };

  const handleStartNew = () => {
    setFormData(INITIAL_FORM);
    setSelectedQuote(null);
    setApplicationId("");
    setStep(1);
  };

  return (
    <div className="min-h-screen">
      <Header activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-10" id="main-content">
        {/* ── Apply Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "apply" && (
          <div>
            {/* Hero */}
            {step === 1 && (
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 bg-gold-100 text-gold-800 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                  ✨ Instant Gold Loan – Up to 75% LTV
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                  Get a Loan Against<br />
                  <span className="text-gradient-gold">Your Gold Today</span>
                </h1>
                <p className="text-slate-600 mt-3 text-base">
                  Competitive rates · No hidden charges · AI-powered assistance
                </p>
              </div>
            )}

            {/* Step indicator (steps 1-3) */}
            {step <= 3 && <StepIndicator steps={STEPS} currentStep={step} />}

            {/* Application form card */}
            <div className="glass-card p-6 sm:p-8">
              {step === 1 && (
                <DetailsForm
                  formData={formData}
                  onChange={handleFormChange}
                  onNext={() => setStep(2)}
                />
              )}

              {step === 2 && (
                <LiveQuote
                  formData={formData}
                  onChange={(data) => {
                    handleQuoteChange(data);
                    // Update selected quote when plan changes
                  }}
                  onNext={() => {
                    // We'll get the quote from the LiveQuote component via formData
                    setStep(3);
                  }}
                  onBack={() => setStep(1)}
                />
              )}

              {step === 3 && formData.planId && (
                <QuoteResolver
                  formData={formData}
                  onBack={() => setStep(2)}
                  onSuccess={handleSuccess}
                />
              )}

              {step === 4 && (
                <SuccessScreen
                  applicationId={applicationId}
                  onStartNew={handleStartNew}
                />
              )}
            </div>

            {/* Trust signals */}
            {step === 1 && (
              <div className="mt-6 grid grid-cols-3 gap-3 text-center animate-fade-in">
                {[
                  { icon: "🔒", label: "Secure", sub: "256-bit SSL" },
                  { icon: "⚡", label: "Instant", sub: "2-min process" },
                  { icon: "🏆", label: "Trusted", sub: "10,000+ customers" },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="glass-card py-3 px-2">
                    <div className="text-2xl mb-1">{icon}</div>
                    <p className="text-xs font-bold text-slate-700">{label}</p>
                    <p className="text-[10px] text-slate-500">{sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Admin Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "admin" && (
          <div className="glass-card p-6 sm:p-8">
            <AdminView />
          </div>
        )}

        {/* ── AI Chat Tab ───────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div className="glass-card overflow-hidden">
            <AiChat />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-slate-400">
        <p>© 2024 GoldLoan Portal. For demonstration purposes only.</p>
        <p className="mt-1">Mock gold rate: ₹7,000/g (24K). Not financial advice.</p>
      </footer>
    </div>
  );
}

// ─── Quote Resolver – fetches quote data for Confirm step ─────────────────────

/**
 * This component re-fetches the quote for the confirm step.
 * Ensures we have up-to-date quote data even if user navigates back.
 */
function QuoteResolver({
  formData,
  onBack,
  onSuccess,
}: {
  formData: ApplicationFormData;
  onBack: () => void;
  onSuccess: (id: string) => void;
}) {
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const gross = parseFloat(formData.grossWeightGrams);
    const net = parseFloat(formData.netWeightGrams);
    const karat = parseInt(formData.karat) as 18 | 22 | 24;

    fetchQuote({ grossWeightGrams: gross, netWeightGrams: net, karat })
      .then((data) => {
        const selected = data.quotes.find((q) => q.planId === formData.planId);
        setQuote(selected || null);
      })
      .catch(() => setQuote(null))
      .finally(() => setIsLoading(false));
  }, [formData.grossWeightGrams, formData.netWeightGrams, formData.karat, formData.planId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>Unable to load quote. Please go back and try again.</p>
        <button onClick={onBack} className="btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return <ConfirmStep formData={formData} selectedQuote={quote} onBack={onBack} onSuccess={onSuccess} />;
}

