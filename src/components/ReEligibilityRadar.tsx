import React, { useState, useMemo } from 'react';
import {
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Calendar,
  Building2,
  DollarSign,
  UserCheck,
  Zap,
  Printer,
  Eye,
} from 'lucide-react';
import { Customer, Loan, ReEligibilityInfo, ReEligibilityTier } from '../types';
import { evaluateReEligibility, formatCurrency, formatDate } from '../utils/loanCalculations';
import { exportReEligibilityReportCSV } from '../utils/exportCsv';

interface ReEligibilityRadarProps {
  loans: Loan[];
  customers: Customer[];
  searchQuery: string;
  onOpenWhatsApp: (loan: Loan, customer: Customer, templateType: 'completion' | 'topup' | 'renewal') => void;
  onOpenFollowUpModal: (loan: Loan, customer: Customer) => void;
  onOpenNewLoanModal: (preselectedCustomerId?: string) => void;
  onPrintCustomer?: (customer: Customer) => void;
  onViewCustomerProfile?: (customer: Customer) => void;
}

export const ReEligibilityRadar: React.FC<ReEligibilityRadarProps> = ({
  loans,
  customers,
  searchQuery,
  onOpenWhatsApp,
  onOpenFollowUpModal,
  onOpenNewLoanModal,
  onPrintCustomer,
  onViewCustomerProfile,
}) => {
  const [tierFilter, setTierFilter] = useState<'ALL' | 'CRITICAL' | 'UPCOMING' | 'TOPUP'>('ALL');

  const customerMap = useMemo(() => {
    return new Map<string, Customer>(customers.map((c) => [c.id, c]));
  }, [customers]);

  // Compute re-eligibility for all loans and sort by priority score
  const evaluatedList: { loan: Loan; customer: Customer; info: ReEligibilityInfo }[] = useMemo(() => {
    const list: { loan: Loan; customer: Customer; info: ReEligibilityInfo }[] = [];

    loans.forEach((loan) => {
      const customer = customerMap.get(loan.customerId);
      if (!customer) return;

      const info = evaluateReEligibility(loan);

      // We only surface actionable loans in the radar:
      // Critical (Finished or ending in <=15 days), Upcoming (16-60 days), or Top-up eligible (>=60%)
      if (
        info.tier === 'CRITICAL_CALL_NOW' ||
        info.tier === 'UPCOMING_RENEWAL' ||
        info.tier === 'TOP_UP_ELIGIBLE'
      ) {
        // Apply search query filter if typed in Header
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = customer.name.toLowerCase().includes(q);
          const matchMobile = customer.mobile.includes(q);
          const matchBank = loan.bankName.toLowerCase().includes(q);
          const matchLoanType = loan.loanType.toLowerCase().includes(q);
          const matchCity = (customer.city || '').toLowerCase().includes(q);
          if (!matchName && !matchMobile && !matchBank && !matchLoanType && !matchCity) {
            return;
          }
        }

        list.push({ loan, customer, info });
      }
    });

    // Sort by priority score (descending: 100 first, then 95, 80, etc.)
    return list.sort((a, b) => b.info.priorityScore - a.info.priorityScore);
  }, [loans, customerMap, searchQuery]);

  // Filter based on selected chip
  const filteredList = useMemo(() => {
    if (tierFilter === 'ALL') return evaluatedList;
    if (tierFilter === 'CRITICAL') {
      return evaluatedList.filter((item) => item.info.tier === 'CRITICAL_CALL_NOW');
    }
    if (tierFilter === 'UPCOMING') {
      return evaluatedList.filter((item) => item.info.tier === 'UPCOMING_RENEWAL');
    }
    if (tierFilter === 'TOPUP') {
      return evaluatedList.filter((item) => item.info.tier === 'TOP_UP_ELIGIBLE');
    }
    return evaluatedList;
  }, [evaluatedList, tierFilter]);

  // Metrics summary
  const counts = useMemo(() => {
    let critical = 0;
    let upcoming = 0;
    let topUp = 0;
    evaluatedList.forEach((item) => {
      if (item.info.tier === 'CRITICAL_CALL_NOW') critical++;
      else if (item.info.tier === 'UPCOMING_RENEWAL') upcoming++;
      else if (item.info.tier === 'TOP_UP_ELIGIBLE') topUp++;
    });
    return { critical, upcoming, topUp, total: evaluatedList.length };
  }, [evaluatedList]);

  return (
    <div className="space-y-5">
      {/* Strategy / Context Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Office Business Growth Strategy</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Customer Re-Eligibility & Loan Renewal Radar
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              When a customer completes their bank loan, they already trust your office and have a proven repayment record.
              Reach out before other agents do to offer their next loan or instant top-up!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="export-calling-list-btn"
              onClick={() => exportReEligibilityReportCSV(loans)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Calling List (.csv)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs / Metric Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="filter-radar-all"
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              tierFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Actionable Calls ({counts.total})
          </button>

          <button
            id="filter-radar-critical"
            onClick={() => setTierFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              tierFilter === 'CRITICAL'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>🔥 Finished / Matures in ≤15 Days ({counts.critical})</span>
          </button>

          <button
            id="filter-radar-upcoming"
            onClick={() => setTierFilter('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              tierFilter === 'UPCOMING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>⚡ Maturing in 16–60 Days ({counts.upcoming})</span>
          </button>

          <button
            id="filter-radar-topup"
            onClick={() => setTierFilter('TOPUP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              tierFilter === 'TOPUP'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>🚀 Top-Up Eligible (≥60% Paid) ({counts.topUp})</span>
          </button>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing {filteredList.length} re-loan prospects
        </span>
      </div>

      {/* Cards List */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Customers in this Calling Category</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `No loan records matched "${searchQuery}". Clear your search to see all re-eligibility alerts.`
              : 'All pending customers have been called or their loans are in early tenures. Keep adding new customers to feed your repeat pipeline!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map(({ loan, customer, info }) => {
            const isCompleted = info.daysRemaining <= 0 || loan.status === 'Completed';
            const isCritical = info.tier === 'CRITICAL_CALL_NOW';
            const isUpcoming = info.tier === 'UPCOMING_RENEWAL';

            // Card border styling based on urgency
            const borderStyle = isCritical
              ? 'border-red-300 hover:border-red-400 ring-1 ring-red-100'
              : isUpcoming
              ? 'border-amber-300 hover:border-amber-400'
              : 'border-emerald-200 hover:border-emerald-300';

            const badgeBg = isCritical
              ? 'bg-red-50 text-red-800 border-red-200'
              : isUpcoming
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200';

            const progressBg = isCritical ? 'bg-red-600' : isUpcoming ? 'bg-amber-500' : 'bg-emerald-600';

            return (
              <div
                key={loan.id}
                id={`radar-card-${loan.id}`}
                className={`bg-white rounded-xl border p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all duration-200 ${borderStyle}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Column: Customer & Loan Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-blue-900">{customer.name}</span>
                      </h3>

                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {customer.city || 'Office Client'}
                      </span>

                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {customer.employmentType}
                      </span>

                      {/* Tier Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeBg}`}>
                        {isCritical ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            {isCompleted
                              ? `Finished (${Math.abs(info.daysRemaining)} days ago)`
                              : `Finishes in ${info.daysRemaining} days!`}
                          </>
                        ) : isUpcoming ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Finishing in {info.daysRemaining} days
                          </>
                        ) : (
                          <>
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            {info.percentCompleted}% Paid • Top-Up Ready
                          </>
                        )}
                      </span>
                    </div>

                    {/* Bank, Amount, and Tenures */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Bank & Type</p>
                          <p className="font-semibold text-slate-800">
                            {loan.bankName} • {loan.loanType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Disbursed Amount</p>
                          <p className="font-bold text-slate-900">
                            {formatCurrency(loan.principalAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Loan Period</p>
                          <p className="font-medium text-slate-700">
                            {formatDate(loan.disbursalDate)} → {formatDate(loan.maturityDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Pre-Approved Potential</p>
                          <p className="font-bold text-emerald-700">
                            ~{formatCurrency(info.estimatedTopUpEligibleAmount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tenure Progress Bar */}
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-medium text-slate-600">
                        <span>
                          Repayment Progress: <strong>{info.monthsCompleted} of {info.totalTenureMonths} months</strong>
                        </span>
                        <span className="font-bold text-slate-800">{info.percentCompleted}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${progressBg}`}
                          style={{ width: `${info.percentCompleted}%` }}
                        />
                      </div>
                    </div>

                    {/* Calling Advice & Notes */}
                    <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                      <span className="font-bold text-blue-700 shrink-0 uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-blue-100 rounded">
                        Recommended Action
                      </span>
                      <p className="text-slate-700 font-medium">{info.recommendedAction}</p>
                      {loan.notes && (
                        <span className="text-slate-500 italic ml-auto text-[11px] hidden md:inline">
                          Note: "{loan.notes}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Direct Call & Action Tools */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-right hidden lg:block">
                      <p className="text-[11px] text-slate-500">Contact Number</p>
                      <p className="text-sm font-bold font-mono text-slate-900">{customer.mobile}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Direct Phone Call Button */}
                      <a
                        id={`call-btn-${loan.id}`}
                        href={`tel:${customer.mobile.replace(/\s+/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Click to dial directly"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>

                      {/* WhatsApp Pre-Filled Message */}
                      <button
                        id={`whatsapp-btn-${loan.id}`}
                        onClick={() =>
                          onOpenWhatsApp(
                            loan,
                            customer,
                            isCompleted ? 'completion' : isUpcoming ? 'renewal' : 'topup'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-green-700 hover:bg-green-800 active:bg-green-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        title="Send loan proposal on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Log Call Outcome */}
                      <button
                        id={`log-call-btn-${loan.id}`}
                        onClick={() => onOpenFollowUpModal(loan, customer)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Log customer response & next follow-up date"
                      >
                        <span>Log Call</span>
                      </button>

                      {/* Print Customer Dossier */}
                      {onPrintCustomer && (
                        <button
                          id={`print-radar-cust-${loan.id}`}
                          onClick={() => onPrintCustomer(customer)}
                          className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                          title="Print single-page customer dossier"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">Print</span>
                        </button>
                      )}

                      {/* Immediate Repeat Loan */}
                      <button
                        id={`repeat-loan-btn-${loan.id}`}
                        onClick={() => onOpenNewLoanModal(customer.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                        title="Issue new loan for this customer"
                      >
                        <span>+ New Loan</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
