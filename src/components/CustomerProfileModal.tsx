import React from 'react';
import {
  X,
  User,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  DollarSign,
  PlusCircle,
  Edit2,
  MapPin,
  Briefcase,
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { Customer, Loan, FollowUpLog } from '../types';
import { formatCurrency, formatDate, evaluateReEligibility } from '../utils/loanCalculations';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  loans: Loan[];
  followUps: FollowUpLog[];
  onEditCustomer: (customer: Customer) => void;
  onOpenNewLoanModal?: (customerId: string) => void;
  onOpenNewLoan?: (customerId: string) => void;
  onOpenWhatsApp?: (loan: Loan, customer: Customer, templateType: 'completion' | 'topup' | 'renewal') => void;
  onOpenFollowUpModal?: (loan: Loan, customer: Customer) => void;
  onOpenFollowUp?: (loan: Loan, customer: Customer) => void;
  onEditLoan?: (loan: Loan) => void;
  onPrintCustomer?: (customer: Customer) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  customer,
  loans,
  followUps,
  onEditCustomer,
  onOpenNewLoanModal,
  onOpenNewLoan,
  onOpenWhatsApp,
  onOpenFollowUpModal,
  onOpenFollowUp,
  onEditLoan,
  onPrintCustomer,
}) => {
  if (!isOpen || !customer) return null;

  const handleNewLoan = (custId: string) => {
    if (onOpenNewLoanModal) onOpenNewLoanModal(custId);
    else if (onOpenNewLoan) onOpenNewLoan(custId);
  };

  // Filter loans and follow-ups for this specific customer
  const customerLoans = loans.filter((l) => l.customerId === customer.id);
  const customerFollowUps = followUps.filter((f) => f.customerId === customer.id);

  // Calculate customer portfolio metrics
  const totalDisbursed = customerLoans.reduce((sum, l) => sum + l.principalAmount, 0);
  const totalCommissionEarned = customerLoans.reduce((sum, l) => sum + l.commissionAmount, 0);
  const activeLoans = customerLoans.filter((l) => l.status === 'Active' || l.status === 'Near Maturity');
  const completedLoans = customerLoans.filter((l) => l.status === 'Completed' || l.status === 'Pre-Closed');

  // Find if any loan is ready for repeat loan
  const hasFinishedLoan = customerLoans.some((l) => {
    const re = evaluateReEligibility(l);
    return re.daysRemaining <= 0 || l.status === 'Completed';
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-lg">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{customer.name}</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30">
                  {customer.employmentType}
                </span>
                {completedLoans.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {completedLoans.length} Loan(s) Completed
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Customer ID: <span className="font-mono text-slate-400">{customer.id}</span> • Added {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrintCustomer && (
              <button
                id="customer-profile-print-btn"
                onClick={() => onPrintCustomer(customer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title="Print single-page customer dossier"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Print Dossier</span>
              </button>
            )}
            <button
              id="customer-profile-edit-btn"
              onClick={() => onEditCustomer(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-300" />
              <span>Edit Details</span>
            </button>
            <button
              id="customer-profile-close-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Quick Action & Contact Strip */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Primary Mobile</p>
                  <a
                    href={`tel:${customer.mobile.replace(/\s+/g, '')}`}
                    className="text-sm font-bold font-mono text-blue-700 hover:underline"
                  >
                    {customer.mobile}
                  </a>
                </div>
              </div>

              {customer.alternatePhone && (
                <div className="flex items-center gap-2 border-l border-blue-200/60 pl-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Alternate Phone</p>
                    <a
                      href={`tel:${customer.alternatePhone.replace(/\s+/g, '')}`}
                      className="text-xs font-bold font-mono text-slate-700 hover:underline"
                    >
                      {customer.alternatePhone}
                    </a>
                  </div>
                </div>
              )}

              {customer.city && (
                <div className="flex items-center gap-2 border-l border-blue-200/60 pl-6">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500">City / Location</p>
                    <p className="text-xs font-semibold text-slate-800">{customer.city}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onPrintCustomer && (
                <button
                  id="customer-profile-print-strip-btn"
                  onClick={() => onPrintCustomer(customer)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Sheet</span>
                </button>
              )}
              <button
                id="customer-profile-add-loan-btn"
                onClick={() => {
                  onClose();
                  handleNewLoan(customer.id);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Issue New Loan</span>
              </button>
            </div>
          </div>

          {/* Customer Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Borrowed</p>
              <p className="text-base font-black text-slate-900 mt-0.5">{formatCurrency(totalDisbursed)}</p>
              <p className="text-[11px] text-slate-500">{customerLoans.length} total loan file(s)</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500">Office Commission Earned</p>
              <p className="text-base font-black text-emerald-700 mt-0.5">{formatCurrency(totalCommissionEarned)}</p>
              <p className="text-[11px] text-slate-500">From bank partner payouts</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500">Active Files</p>
              <p className="text-base font-black text-blue-700 mt-0.5">{activeLoans.length} Running</p>
              <p className="text-[11px] text-slate-500">{completedLoans.length} fully paid / closed</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500">Re-Eligibility Status</p>
              {hasFinishedLoan ? (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Ready for Repeat Loan!
                  </span>
                </div>
              ) : activeLoans.length > 0 ? (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active Good Standing
                  </span>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                    No Active Loans
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-1">Based on repayment track</p>
            </div>
          </div>

          {/* Profile & KYC Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Personal, Employment & Financial Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">PAN / Govt ID</p>
                <p className="text-xs font-semibold text-slate-800 font-mono">
                  {customer.panOrId || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Income</p>
                <p className="text-xs font-semibold text-slate-800">
                  {customer.monthlyIncome ? formatCurrency(customer.monthlyIncome) + ' / mo' : 'Not specified'}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
                <p className="text-xs font-semibold text-slate-800">
                  {customer.email || 'Not provided'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-400">Residential / Office Address</p>
                <p className="text-xs text-slate-700">
                  {customer.address || 'No full address logged'}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Internal Consultant Notes</p>
                <p className="text-xs text-slate-700 italic">
                  {customer.notes ? `"${customer.notes}"` : 'No notes added'}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Loans Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-2">
            <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>All Loan Files for this Customer ({customerLoans.length})</span>
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewLoanModal(customer.id);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                + Add Another Loan
              </button>
            </div>

            {customerLoans.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No loans currently logged for this customer.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-4">Bank & Loan Type</th>
                      <th className="py-2.5 px-3">Disbursed (EMI)</th>
                      <th className="py-2.5 px-3">Disbursed On</th>
                      <th className="py-2.5 px-3">Maturity Date</th>
                      <th className="py-2.5 px-3">Commission</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-4 text-right">Quick Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerLoans.map((loan) => {
                      const re = evaluateReEligibility(loan);
                      const isFinished = re.daysRemaining <= 0 || loan.status === 'Completed';

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{loan.bankName}</p>
                            <p className="text-[11px] text-slate-500">{loan.loanType}</p>
                            <p className="font-mono text-[10px] text-slate-400">A/C: {loan.accountNumber}</p>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{formatCurrency(loan.principalAmount)}</p>
                            <p className="text-[11px] text-slate-600">EMI: {formatCurrency(loan.emiAmount)}</p>
                            <p className="text-[10px] text-slate-400">{loan.interestRate}% • {loan.tenureMonths}m</p>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            {formatDate(loan.disbursalDate)}
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-800">{formatDate(loan.maturityDate)}</p>
                            {isFinished ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800">
                                Matured
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">
                                {re.daysRemaining} days left
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-bold text-emerald-700">{formatCurrency(loan.commissionAmount)}</p>
                            <span className="text-[10px] text-slate-500">{loan.bankCommissionPercent}% ({loan.commissionStatus})</span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                loan.status === 'Completed'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : loan.status === 'Near Maturity'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {loan.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onOpenWhatsApp && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onOpenWhatsApp(loan, customer, isFinished ? 'completion' : 'topup');
                                  }}
                                  title="Send WhatsApp Message"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md border border-emerald-200 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {(onOpenFollowUpModal || onOpenFollowUp) && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    if (onOpenFollowUpModal) onOpenFollowUpModal(loan, customer);
                                    else if (onOpenFollowUp) onOpenFollowUp(loan, customer);
                                  }}
                                  title="Log Follow-Up Call"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer Call & Outreach History */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Call Logs & Follow-Up History ({customerFollowUps.length})</span>
              </h3>
            </div>

            {customerFollowUps.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-2">
                No past follow-up calls logged for this customer yet. Click the phone icon to log outreach.
              </p>
            ) : (
              <div className="space-y-2">
                {customerFollowUps.map((fu) => (
                  <div key={fu.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{fu.outcome}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(fu.date)}</span>
                    </div>
                    {fu.notes && <p className="text-xs text-slate-600">"{fu.notes}"</p>}
                    {fu.nextFollowUpDate && (
                      <p className="text-[11px] font-medium text-amber-700">
                        Next Scheduled Callback: {formatDate(fu.nextFollowUpDate)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Click on customer phone to call directly or send WhatsApp template.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
