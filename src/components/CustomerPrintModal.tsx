import React, { useRef } from 'react';
import {
  Printer,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  User,
  AlertCircle,
} from 'lucide-react';
import { Customer, Loan, FollowUpLog } from '../types';
import { formatCurrency, formatDate, evaluateReEligibility } from '../utils/loanCalculations';

interface CustomerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  loans: Loan[];
  followUps: FollowUpLog[];
  customers?: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
}

export const CustomerPrintModal: React.FC<CustomerPrintModalProps> = ({
  isOpen,
  onClose,
  customer,
  loans,
  followUps,
  customers = [],
  onSelectCustomer,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !customer) return null;

  // Filter records for this customer
  const customerLoans = loans.filter((l) => l.customerId === customer.id);
  const customerFollowUps = followUps.filter((f) => f.customerId === customer.id);

  // Compute metrics
  const totalBorrowed = customerLoans.reduce((sum, l) => sum + l.principalAmount, 0);
  const activeLoans = customerLoans.filter((l) => l.status === 'Active' || l.status === 'Near Maturity');
  const activeTotal = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
  const completedLoans = customerLoans.filter((l) => l.status === 'Completed' || l.status === 'Pre-Closed');

  // Overall Re-eligibility status
  const hasFinishedLoan = customerLoans.some((l) => {
    const re = evaluateReEligibility(l);
    return re.daysRemaining <= 0 || l.status === 'Completed';
  });

  const hasTopUpEligible = customerLoans.some((l) => {
    const re = evaluateReEligibility(l);
    return re.percentCompleted >= 60 && l.status !== 'Completed';
  });

  const overallStatus = hasFinishedLoan
    ? 'ELIGIBLE FOR REPEAT / FRESH LOAN'
    : hasTopUpEligible
    ? 'ELIGIBLE FOR TOP-UP LOAN (60%+ PAID)'
    : activeLoans.length > 0
    ? 'ACTIVE RUNNING LOAN'
    : 'REGISTERED CLIENT';

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:my-0 print:rounded-none">
        
        {/* Modal Toolbar (HIDDEN DURING PRINT) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Print Single-Page Customer Dossier</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  Galaxy Consultancy
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Optimized to fit on a single A4 page for client records & physical filing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Customer Switcher */}
            {customers.length > 1 && onSelectCustomer && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 hidden sm:inline">Switch Customer:</span>
                <select
                  id="print-customer-selector"
                  value={customer.id}
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    if (found) onSelectCustomer(found);
                  }}
                  className="bg-slate-800 text-white border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              id="print-action-btn"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              id="close-print-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Sheet Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible flex justify-center">
          
          {/* THE SINGLE PAGE SHEET */}
          <div
            ref={printContainerRef}
            id="printable-customer-sheet"
            className="bg-white border border-slate-300 print:border-none shadow-sm rounded-lg p-6 sm:p-7 max-w-[210mm] w-full text-slate-900 print:max-w-none print:p-2 print:shadow-none"
            style={{ minHeight: '260mm', pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            {/* Header / Office Identity */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-blue-900 text-white font-black text-sm flex items-center justify-center font-mono">
                    G
                  </span>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                    Galaxy Consultancy
                  </h1>
                </div>
                <p className="text-[11px] font-bold text-blue-900 tracking-wide mt-0.5">
                  LOAN & CREDIT CONSULTANCY DESK • DIRECT SALES ASSOCIATE (DSA)
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Financial Advisory • Retail & Business Lending • Multi-Bank Facilitation
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block bg-slate-900 text-white px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">
                  Customer Loan Dossier
                </div>
                <p className="text-[10px] font-semibold text-slate-600 mt-1">
                  Issue Date: <span className="text-slate-900 font-bold">{todayStr}</span>
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Ref: <span className="font-bold text-slate-800">GC-{customer.id.toUpperCase()}</span>
                </p>
              </div>
            </div>

            {/* Customer Personal & Contact Profile Grid */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-950 mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>Customer Identification & Profile</span>
                <span className="text-[9px] font-semibold text-slate-500">Registered: {formatDate(customer.createdAt)}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Customer Name</span>
                  <strong className="text-sm text-slate-950 block">{customer.name}</strong>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Customer ID</span>
                  <span className="font-mono font-bold text-slate-800">{customer.id}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Primary Mobile</span>
                  <strong className="font-mono text-blue-900">{customer.mobile}</strong>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Alternate Contact</span>
                  <span className="font-mono text-slate-700">{customer.alternatePhone || 'None Specified'}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Employment Profile</span>
                  <span className="font-semibold text-slate-800">{customer.employmentType}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Monthly Income</span>
                  <strong className="text-slate-900">
                    {customer.monthlyIncome ? `₹${customer.monthlyIncome.toLocaleString('en-IN')}` : 'Not Specified'}
                  </strong>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">PAN / Govt ID</span>
                  <span className="font-mono font-bold text-slate-800">{customer.panOrId || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">City / Address</span>
                  <span className="font-medium text-slate-800">{customer.city || 'Local Territory'}</span>
                </div>
              </div>
            </div>

            {/* Portfolio Summary 4-KPI Row */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-center">
                <span className="text-[9px] font-bold uppercase text-slate-500 block">Total Disbursed</span>
                <strong className="text-xs font-bold text-slate-950 font-mono">
                  {formatCurrency(totalBorrowed)}
                </strong>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-center">
                <span className="text-[9px] font-bold uppercase text-slate-500 block">Active Exposure</span>
                <strong className="text-xs font-bold text-blue-900 font-mono">
                  {formatCurrency(activeTotal)} ({activeLoans.length})
                </strong>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-center">
                <span className="text-[9px] font-bold uppercase text-slate-500 block">Closed Files</span>
                <strong className="text-xs font-bold text-emerald-800 font-mono">
                  {completedLoans.length} Loans
                </strong>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded p-2 text-center">
                <span className="text-[9px] font-bold uppercase text-blue-800 block">Re-Eligibility Status</span>
                <strong className="text-[10px] font-bold text-blue-950 block leading-tight">
                  {overallStatus}
                </strong>
              </div>
            </div>

            {/* Loan Facility Breakdown Table */}
            <div className="mt-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
                <span>Sanctioned Loan Facilities ({customerLoans.length})</span>
                <span className="text-[9px] text-slate-500 font-normal">Details as per bank sanction schedules</span>
              </div>

              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 uppercase text-[9px]">
                      <th className="py-1.5 px-2">#</th>
                      <th className="py-1.5 px-2">Bank / Lender</th>
                      <th className="py-1.5 px-2">Loan Type</th>
                      <th className="py-1.5 px-2">Disbursed (₹)</th>
                      <th className="py-1.5 px-2">Monthly EMI</th>
                      <th className="py-1.5 px-2">Disbursed</th>
                      <th className="py-1.5 px-2">Maturity</th>
                      <th className="py-1.5 px-2">Tenure Paid</th>
                      <th className="py-1.5 px-2">Status</th>
                      <th className="py-1.5 px-2">Calling / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customerLoans.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-4 text-center text-slate-500 italic">
                          No loan facilities recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      customerLoans.map((loan, idx) => {
                        const re = evaluateReEligibility(loan);
                        const isMatured = re.daysRemaining <= 0 || loan.status === 'Completed';

                        return (
                          <tr key={loan.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-1.5 px-2 font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-bold text-slate-900">{loan.bankName}</td>
                            <td className="py-1.5 px-2 font-medium text-slate-800">{loan.loanType}</td>
                            <td className="py-1.5 px-2 font-mono font-bold text-slate-900">
                              {formatCurrency(loan.principalAmount)}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-slate-700">
                              {loan.emiAmount ? formatCurrency(loan.emiAmount) : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-slate-600">{formatDate(loan.disbursementDate)}</td>
                            <td className="py-1.5 px-2 font-semibold text-slate-800">{formatDate(loan.maturityDate)}</td>
                            <td className="py-1.5 px-2">
                              <span className="font-semibold text-slate-800">
                                {re.percentCompleted}%
                              </span>
                              <span className="text-[8px] text-slate-500 block">
                                ({loan.tenureMonths} Mo)
                              </span>
                            </td>
                            <td className="py-1.5 px-2">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                  loan.status === 'Completed'
                                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                    : loan.status === 'Near Maturity'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-blue-50 text-blue-900 border border-blue-200'
                                }`}
                              >
                                {loan.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-medium">
                              {isMatured ? (
                                <span className="text-red-700 font-bold">Matured • Renew Now</span>
                              ) : re.percentCompleted >= 60 ? (
                                <span className="text-emerald-700 font-bold">Top-Up Ready</span>
                              ) : (
                                <span className="text-slate-600">{re.monthsRemaining} mo left</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Follow-up / Client Interaction Log (Compact) */}
            <div className="mt-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
                <span>Advisor Notes & Follow-up History</span>
                <span className="text-[9px] text-slate-500 font-normal">Internal Galaxy Consultancy communication log</span>
              </div>

              <div className="border border-slate-200 rounded p-2 bg-slate-50/60 text-[10px]">
                {customerFollowUps.length === 0 ? (
                  <p className="text-slate-500 italic">
                    Account in good standing. No prior call complaints or special remarks logged.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {customerFollowUps.slice(0, 3).map((fu) => (
                      <div key={fu.id} className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1 last:border-none last:pb-0">
                        <div>
                          <span className="font-semibold text-slate-900">{formatDate(fu.callDate)}</span>
                          <span className="mx-1 text-slate-400">•</span>
                          <span className="text-slate-700 font-medium">[{fu.responseType}]</span>
                          <p className="text-slate-600 mt-0.5">{fu.notes}</p>
                        </div>
                        {fu.nextFollowUpDate && (
                          <span className="text-[9px] font-mono text-blue-800 font-semibold shrink-0">
                            Next Follow-up: {formatDate(fu.nextFollowUpDate)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Notes / Special Conditions if any */}
            {customer.notes && (
              <div className="mt-2 text-[10px] bg-amber-50/60 border border-amber-200 rounded px-2.5 py-1 text-amber-950">
                <span className="font-bold uppercase text-[9px] text-amber-800 mr-1">Advisor Remarks:</span>
                <span>{customer.notes}</span>
              </div>
            )}

            {/* Sign-off & Verification Footer */}
            <div className="mt-4 pt-3 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-8 items-end text-[10px]">
                <div>
                  <div className="h-10 border-b border-slate-400 flex items-end pb-1">
                    <span className="font-mono text-[9px] text-slate-400">[Official Desk Seal & Signature]</span>
                  </div>
                  <p className="font-bold text-slate-900 mt-1">Galaxy Consultancy</p>
                  <p className="text-[9px] text-slate-500">Authorized Loan Advisor & Desk Verification</p>
                </div>

                <div className="text-right">
                  <div className="h-10 border-b border-slate-400 flex items-end justify-end pb-1">
                    <span className="font-mono text-[9px] text-slate-400">[Customer Signature]</span>
                  </div>
                  <p className="font-bold text-slate-900 mt-1">{customer.name}</p>
                  <p className="text-[9px] text-slate-500">Client Acknowledgement Signature</p>
                </div>
              </div>

              <p className="text-[8px] text-center text-slate-400 mt-3 uppercase tracking-wider">
                CONFIDENTIAL — PREPARED BY GALAXY CONSULTANCY FOR CREDIT PORTFOLIO EVALUATION & SERVICING RECORDS ONLY
              </p>
            </div>

          </div>
        </div>

        {/* Modal Bottom Footer (HIDDEN DURING PRINT) */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Printing Tip:</span>
            <span>Check "Background graphics" in printer options to include clean borders & badges.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Page (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
