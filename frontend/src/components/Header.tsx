/**
 * Header Component – Top navigation bar for the Gold Loan Portal
 */

import { GoldCoinIcon, TableIcon, ChatIcon } from "./ui/Icons";

interface HeaderProps {
  activeTab: "apply" | "admin" | "chat";
  onTabChange: (tab: "apply" | "admin" | "chat") => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const navItems = [
    { id: "apply" as const, label: "Apply", icon: GoldCoinIcon },
    { id: "chat" as const, label: "AI Assist", icon: ChatIcon },
    { id: "admin" as const, label: "Admin", icon: TableIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-md shadow-gold-500/30">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none text-lg">
                Gold<span className="text-gradient-gold">Loan</span>
              </h1>
              <p className="text-xs text-slate-500 leading-none mt-0.5">Instant Gold Loans</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl" aria-label="Main navigation">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === id
                    ? "bg-white text-gold-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-current={activeTab === id ? "page" : undefined}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
