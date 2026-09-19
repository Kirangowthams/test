import React from 'react';
import {
  PhoneCall,
  PlusCircle,
  Database,
  RefreshCw,
  Search,
  Bell,
  AlertTriangle,
  Shield,
  LogOut,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenNewLoanModal: () => void;
  onOpenBackupModal: () => void;
  onOpenSecurityModal: () => void;
  onLogout: () => void;
  userName?: string;
  urgentCount: number;
  totalPendingCommission: number;
  onRefresh: () => void;
  activeTab: 'radar' | 'directory' | 'analytics' | 'followups';
  setActiveTab: (tab: 'radar' | 'directory' | 'analytics' | 'followups') => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewLoanModal,
  onOpenBackupModal,
  onOpenSecurityModal,
  onLogout,
  userName = 'Galaxy Consultancy',
  urgentCount,
  totalPendingCommission,
  onRefresh,
  activeTab,
  setActiveTab,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Main Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100 dark:ring-blue-900">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Galaxy Consultancy
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Loan Consultant CRM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Customer Database, Bank Commission & Loan Re-Eligibility Calling Radar
              </p>
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Search Box */}
            <div className="relative min-w-[180px] sm:min-w-[220px] flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name, phone, bank..."
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Dark / Light Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-amber-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-medium">Dark</span>
                </>
              )}
            </button>

            {/* Quick Actions */}
            <button
              id="refresh-btn"
              onClick={onRefresh}
              title="Refresh database records"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              id="backup-btn"
              onClick={onOpenBackupModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Backup</span>
            </button>

            <button
              id="security-btn"
              onClick={onOpenSecurityModal}
              title="Office Security & Settings"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              id="new-loan-btn"
              onClick={onOpenNewLoanModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Loan</span>
            </button>

            {/* User Profile & Quick Lock / Logout */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700 ml-1">
              <button
                id="header-user-btn"
                onClick={onOpenSecurityModal}
                title="Account details"
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {userName}
                </span>
              </button>

              <button
                id="lock-portal-btn"
                onClick={onLogout}
                title="Lock portal & Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Quick Status Bar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0" aria-label="Tabs">
            <button
              id="tab-radar"
              onClick={() => setActiveTab('radar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'radar'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Re-Eligibility Calling Radar</span>
              {urgentCount > 0 && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {urgentCount} Due
                </span>
              )}
            </button>

            <button
              id="tab-directory"
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Customer & Loan Directory
            </button>

            <button
              id="tab-followups"
              onClick={() => setActiveTab('followups')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'followups'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Call History & Outcomes
            </button>

            <button
              id="tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Commissions & Bank Analytics
            </button>
          </nav>

          {/* Quick info snippet */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {urgentCount > 0 ? (
              <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {urgentCount} customers ready to renew loans!
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md font-medium border border-emerald-200 dark:border-emerald-800/50">
                Calling queue up to date
              </span>
            )}
            {totalPendingCommission > 0 && (
              <span className="hidden md:inline font-medium text-slate-700 dark:text-slate-300">
                Pending Bank Commission: <strong className="text-blue-700 dark:text-blue-400">{formatCurrency(totalPendingCommission)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
