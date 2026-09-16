import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';
import { Customer, Loan } from '../types';
import { formatCurrency, formatDate, evaluateReEligibility } from '../utils/loanCalculations';

interface StatsOverviewProps {
  loans: Loan[];
  customers: Customer[];
  onOpenNewLoanModal: () => void;
  onViewCustomerProfile?: (customer: Customer) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  loans,
  customers,
  onOpenNewLoanModal,
  onViewCustomerProfile,
}) => {
  const [historyPeriod, setHistoryPeriod] = useState<'months' | 'years'>('months');

  // Comprehensive aggregate statistics
  const stats = useMemo(() => {
    let totalDisbursed = 0;
    let totalCommission = 0;
    let commissionReceived = 0;
    let commissionPending = 0;
    let urgentReEligibility = 0;
    let topUpEligible = 0;
    let activeLoans = 0;
    let completedLoans = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const prevYear = currentYear - 1;
    const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Monthly & Yearly metrics for completed files
    let completedThisMonth = 0;
    let completedThisMonthVolume = 0;
    let completedThisYear = 0;
    let completedThisYearVolume = 0;
    let completedPrevYear = 0;
    let completedPrevYearVolume = 0;

    // Disbursal volumes by year for growth calculation
    let disbursedThisYear = 0;
    let disbursedPrevYear = 0;
    let commissionThisYear = 0;
    let commissionPrevYear = 0;

    loans.forEach((loan) => {
      totalDisbursed += loan.principalAmount;
      totalCommission += loan.commissionAmount;

      if (loan.commissionStatus === 'Received') {
        commissionReceived += loan.commissionAmount;
      } else {
        commissionPending += loan.commissionAmount;
      }

      const isCompleted = loan.status === 'Completed';
      if (isCompleted) {
        completedLoans++;
      } else {
        activeLoans++;
      }

      // Check dates for completed files
      // Use maturityDate as the completion timestamp
      const effectiveDate = new Date(loan.maturityDate || loan.updatedAt || loan.disbursalDate);
      const fileYear = effectiveDate.getFullYear();
      const fileMonthKey = `${fileYear}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}`;

      if (isCompleted) {
        if (fileMonthKey === currentMonthKey) {
          completedThisMonth++;
          completedThisMonthVolume += loan.principalAmount;
        }
        if (fileYear === currentYear) {
          completedThisYear++;
          completedThisYearVolume += loan.principalAmount;
        } else if (fileYear === prevYear) {
          completedPrevYear++;
          completedPrevYearVolume += loan.principalAmount;
        }
      }

      // Check disbursal year
      const disbursalYear = new Date(loan.disbursalDate).getFullYear();
      if (disbursalYear === currentYear) {
        disbursedThisYear += loan.principalAmount;
        commissionThisYear += loan.commissionAmount;
      } else if (disbursalYear === prevYear) {
        disbursedPrevYear += loan.principalAmount;
        commissionPrevYear += loan.commissionAmount;
      }

      const re = evaluateReEligibility(loan);
      if (re.tier === 'CRITICAL_CALL_NOW') {
        urgentReEligibility++;
      } else if (re.tier === 'TOP_UP_ELIGIBLE') {
        topUpEligible++;
      }
    });

    // Yearly Growth calculations
    // File completion growth YoY
    const fileGrowthRate =
      completedPrevYear > 0
        ? ((completedThisYear - completedPrevYear) / completedPrevYear) * 100
        : completedThisYear > 0
        ? 100
        : 0;

    // Volume growth YoY
    const volumeGrowthRate =
      disbursedPrevYear > 0
        ? ((disbursedThisYear - disbursedPrevYear) / disbursedPrevYear) * 100
        : disbursedThisYear > 0
        ? 100
        : 0;

    // Commission growth YoY
    const commissionGrowthRate =
      commissionPrevYear > 0
        ? ((commissionThisYear - commissionPrevYear) / commissionPrevYear) * 100
        : commissionThisYear > 0
        ? 100
        : 0;

    // Count customers with completed vs active files
    const customersWithCompleted = new Set(
      loans.filter((l) => l.status === 'Completed').map((l) => l.customerId)
    ).size;
    const customersWithActive = new Set(
      loans.filter((l) => l.status !== 'Completed').map((l) => l.customerId)
    ).size;

    return {
      totalDisbursed,
      totalCommission,
      commissionReceived,
      commissionPending,
      urgentReEligibility,
      topUpEligible,
      activeLoans,
      completedLoans,
      totalCustomers: customers.length,
      customersWithCompleted,
      customersWithActive,
      completedThisMonth,
      completedThisMonthVolume,
      completedThisYear,
      completedThisYearVolume,
      completedPrevYear,
      completedPrevYearVolume,
      disbursedThisYear,
      disbursedPrevYear,
      commissionThisYear,
      commissionPrevYear,
      fileGrowthRate,
      volumeGrowthRate,
      commissionGrowthRate,
      currentYear,
      prevYear,
    };
  }, [loans, customers]);

  // Monthly Completed Files Breakdown (Last 12 Months)
  const monthlyCompletedBreakdown = useMemo(() => {
    const list: {
      monthKey: string;
      label: string;
      completedCount: number;
      volume: number;
      commission: number;
      loansList: Loan[];
    }[] = [];

    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

      // Find completed loans belonging to this month
      const matching = loans.filter((l) => {
        if (l.status !== 'Completed') return false;
        const dMat = new Date(l.maturityDate || l.updatedAt);
        const lKey = `${dMat.getFullYear()}-${String(dMat.getMonth() + 1).padStart(2, '0')}`;
        return lKey === key;
      });

      const volume = matching.reduce((sum, l) => sum + l.principalAmount, 0);
      const commission = matching.reduce((sum, l) => sum + l.commissionAmount, 0);

      list.push({
        monthKey: key,
        label,
        completedCount: matching.length,
        volume,
        commission,
        loansList: matching,
      });
    }

    return list;
  }, [loans]);

  // Yearly Completed Files & Growth History
  const yearlyCompletedHistory = useMemo(() => {
    const yearMap = new Map<
      number,
      { completedCount: number; volume: number; commission: number; loansList: Loan[] }
    >();

    loans.forEach((loan) => {
      if (loan.status === 'Completed') {
        const y = new Date(loan.maturityDate || loan.updatedAt).getFullYear();
        const existing = yearMap.get(y) || { completedCount: 0, volume: 0, commission: 0, loansList: [] };
        existing.completedCount++;
        existing.volume += loan.principalAmount;
        existing.commission += loan.commissionAmount;
        existing.loansList.push(loan);
        yearMap.set(y, existing);
      }
    });

    const years = Array.from(yearMap.keys()).sort((a, b) => b - a);
    return years.map((year, index) => {
      const current = yearMap.get(year)!;
      const prevYearData = yearMap.get(year - 1);
      let yoyGrowth = 0;
      if (prevYearData && prevYearData.completedCount > 0) {
        yoyGrowth = ((current.completedCount - prevYearData.completedCount) / prevYearData.completedCount) * 100;
      }
      return {
        year,
        ...current,
        yoyGrowth: Number(yoyGrowth.toFixed(1)),
      };
    });
  }, [loans]);

  // Bank-wise Breakdown
  const bankBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        volume: number;
        commission: number;
        commissionPending: number;
        rates: number[];
      }
    >();

    loans.forEach((l) => {
      const existing = map.get(l.bankName) || {
        count: 0,
        volume: 0,
        commission: 0,
        commissionPending: 0,
        rates: [],
      };
      existing.count++;
      existing.volume += l.principalAmount;
      existing.commission += l.commissionAmount;
      if (l.commissionStatus === 'Pending') {
        existing.commissionPending += l.commissionAmount;
      }
      existing.rates.push(l.bankCommissionPercent);
      map.set(l.bankName, existing);
    });

    return Array.from(map.entries())
      .map(([bank, data]) => {
        const avgRate =
          data.rates.length > 0 ? data.rates.reduce((a, b) => a + b, 0) / data.rates.length : 0;
        return {
          bank,
          ...data,
          avgRate: Number(avgRate.toFixed(2)),
        };
      })
      .sort((a, b) => b.volume - a.volume);
  }, [loans]);

  // Maturity Forecast: Next 6 Months
  const maturityForecast = useMemo(() => {
    const monthsMap = new Map<string, { count: number; volume: number; commissionEstimate: number }>();
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      monthsMap.set(key, { count: 0, volume: 0, commissionEstimate: 0 });
    }

    loans.forEach((loan) => {
      if (loan.maturityDate) {
        const matDate = new Date(loan.maturityDate);
        const key = matDate.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
        if (monthsMap.has(key)) {
          const current = monthsMap.get(key)!;
          current.count++;
          current.volume += loan.principalAmount;
          // Approximate repeat loan commission at 1.75%
          current.commissionEstimate += Math.round(loan.principalAmount * 0.0175);
          monthsMap.set(key, current);
        }
      }
    });

    return Array.from(monthsMap.entries());
  }, [loans]);

  return (
    <div className="space-y-6">
      {/* ROW 1: PRIMARY BUSINESS HIGHLIGHTS (Total Customers, Monthly Completed, Yearly Completed, Yearly Growth) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Customers */}
        <div
          id="stat-card-total-customers"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Customers</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalCustomers}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Registered in Dad's office database
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-blue-700 font-semibold">{stats.customersWithActive} Active Borrowers</span>
            <span className="text-emerald-700 font-semibold">{stats.customersWithCompleted} Repeat Ready</span>
          </div>
        </div>

        {/* Metric 2: Monthly Completed Files */}
        <div
          id="stat-card-monthly-completed"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Monthly Completed Files</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-emerald-700 tracking-tight">
                {stats.completedThisMonth} Files
              </p>
              <span className="text-xs font-medium text-slate-400">this month</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Volume closed: <strong>{formatCurrency(stats.completedThisMonthVolume)}</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Overall Completed:</span>
            <strong className="text-slate-800 font-bold">{stats.completedLoans} files total</strong>
          </div>
        </div>

        {/* Metric 3: Yearly Completed Files */}
        <div
          id="stat-card-yearly-completed"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 hover:border-indigo-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Yearly Completed Files</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-indigo-700 tracking-tight">
                {stats.completedThisYear} Files
              </p>
              <span className="text-xs font-medium text-slate-400">in {stats.currentYear}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Previous year ({stats.prevYear}): <strong>{stats.completedPrevYear} files</strong>
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>{stats.currentYear} Volume Closed:</span>
            <strong className="text-slate-800 font-bold">{formatCurrency(stats.completedThisYearVolume)}</strong>
          </div>
        </div>

        {/* Metric 4: Yearly Growth */}
        <div
          id="stat-card-yearly-growth"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Yearly Growth Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.fileGrowthRate >= 0 ? `+${stats.fileGrowthRate.toFixed(1)}%` : `${stats.fileGrowthRate.toFixed(1)}%`}
              </p>
              {stats.fileGrowthRate >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
              )}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              YoY Completed Files expansion
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Loan Volume:</span>
            <strong className="text-slate-800 font-bold">{formatCurrency(stats.totalDisbursed)}</strong>
          </div>
        </div>
      </div>

      {/* ROW 2: OFFICE FINANCIALS & CALLING PIPELINE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Office Commission */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Commission</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 tracking-tight">
            {formatCurrency(stats.totalCommission)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="text-emerald-700 font-semibold">Cleared: {formatCurrency(stats.commissionReceived)}</span>
            <span className="text-amber-700 font-semibold">Pending: {formatCurrency(stats.commissionPending)}</span>
          </div>
        </div>

        {/* Active Disbursed Loans */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Running Files</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight">
            {stats.activeLoans} Loans
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Currently running and paying EMIs to partner banks
          </p>
        </div>

        {/* Re-Eligibility Calling Goldmine */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ready to Call (Finished)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 tracking-tight">
            {stats.urgentReEligibility} Clients
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Completed or expiring ≤15 days. Call today for repeat loans!
          </p>
        </div>

        {/* Top-Up Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Top-Up Eligible</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-700 tracking-tight">
            {stats.topUpEligible} Clients
          </p>
          <p className="text-[11px] text-slate-500 pt-1">
            Paid ≥60% of tenure. High chance for bank top-up.
          </p>
        </div>
      </div>

      {/* ROW 3: DETAILED TIME-SERIES ANALYTICS (Monthly Completed Files & Yearly Growth) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Completed Files & Business Growth Analytics</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracking monthly completed files and year-over-year office growth
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              id="period-toggle-months"
              onClick={() => setHistoryPeriod('months')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                historyPeriod === 'months'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Breakdown (Last 12 Mo)
            </button>
            <button
              id="period-toggle-years"
              onClick={() => setHistoryPeriod('years')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                historyPeriod === 'years'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yearly Growth History
            </button>
          </div>
        </div>

        {/* TAB A: MONTHLY BREAKDOWN */}
        {historyPeriod === 'months' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {monthlyCompletedBreakdown.slice(0, 6).map((item, idx) => {
                const isCurrentMonth = idx === 0;
                return (
                  <div
                    key={item.monthKey}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCurrentMonth
                        ? 'bg-blue-50/50 border-blue-200'
                        : item.completedCount > 0
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{item.label}</span>
                      {isCurrentMonth && (
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p
                        className={`text-2xl font-black ${
                          item.completedCount > 0 ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {item.completedCount}{' '}
                        <span className="text-xs font-medium text-slate-500">
                          {item.completedCount === 1 ? 'file' : 'files'}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {item.completedCount > 0 ? formatCurrency(item.volume) : 'No completions'}
                      </p>
                    </div>
                    {item.completedCount > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-emerald-800 font-semibold">
                        Commission: {formatCurrency(item.commission)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Monthly Completed Details List */}
            <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-600 uppercase">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Completed Files</th>
                    <th className="py-2.5 px-3">Loan Volume Finished</th>
                    <th className="py-2.5 px-3">Commission Generated</th>
                    <th className="py-2.5 px-3">Customers in this Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyCompletedBreakdown
                    .filter((m) => m.completedCount > 0)
                    .map((m) => (
                      <tr key={m.monthKey} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{m.label}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          {m.completedCount} files closed
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {formatCurrency(m.volume)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {formatCurrency(m.commission)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {m.loansList.map((l) => (
                              <span
                                key={l.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 border border-slate-200"
                              >
                                <strong>{l.customerName}</strong> ({l.bankName})
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB B: YEARLY GROWTH COMPARISON */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Year Summary Cards */}
              {yearlyCompletedHistory.map((item) => (
                <div
                  key={item.year}
                  className={`p-4 rounded-xl border ${
                    item.year === stats.currentYear
                      ? 'bg-blue-50/40 border-blue-200'
                      : 'bg-slate-50/60 border-slate-200'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Year {item.year}</span>
                    {item.yoyGrowth !== 0 && (
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.yoyGrowth > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.yoyGrowth > 0 ? `+${item.yoyGrowth}%` : `${item.yoyGrowth}%`} YoY
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900">
                      {item.completedCount} Files Completed
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Total Volume: <strong>{formatCurrency(item.volume)}</strong>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Commission Earned:</span>
                    <strong className="text-emerald-700">{formatCurrency(item.commission)}</strong>
                  </div>
                </div>
              ))}

              {/* Growth Trajectory Card */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-900">Annual Growth Trajectory</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-800">
                    +{stats.fileGrowthRate.toFixed(1)}% YoY
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Completed loan files velocity between {stats.prevYear} and {stats.currentYear}
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-200 text-xs text-emerald-800">
                  Repeat loan conversion rate is <strong>high</strong> due to on-time follow-ups.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROW 4: PARTNER BANKS & UPCOMING MATURITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Partner Banks Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Partner Bank Commission & Volume</span>
              </h3>
              <p className="text-xs text-slate-500">Commission payout rates & volume received by lending partner</p>
            </div>
          </div>

          <div className="space-y-3">
            {bankBreakdown.map((item) => {
              const share =
                stats.totalDisbursed > 0 ? Math.round((item.volume / stats.totalDisbursed) * 100) : 0;
              return (
                <div key={item.bank} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.bank}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.count} loan(s) • Avg Payout: <strong>{item.avgRate}%</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">{formatCurrency(item.commission)}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Volume: {formatCurrency(item.volume)} ({share}%)
                      </p>
                    </div>
                  </div>

                  {/* Volume progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loan Maturity & Repeat Loan Opportunity Forecast */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Upcoming Maturity Timeline (Next 6 Months)</span>
              </h3>
              <p className="text-xs text-slate-500">Customer loans completing soon — your repeat commission pipeline</p>
            </div>
          </div>

          <div className="space-y-3">
            {maturityForecast.map(([month, data]) => {
              return (
                <div
                  key={month}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{month}</p>
                    <p className="text-[11px] text-slate-500">
                      {data.count === 0 ? (
                        'No loans completing this month'
                      ) : (
                        <span>
                          <strong>{data.count} client(s)</strong> completing loans ({formatCurrency(data.volume)})
                        </span>
                      )}
                    </p>
                  </div>

                  {data.count > 0 && (
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Est. New Payout: ~{formatCurrency(data.commissionEstimate)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

