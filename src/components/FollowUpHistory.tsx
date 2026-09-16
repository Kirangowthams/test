import React, { useState, useMemo } from 'react';
import { Calendar, Phone, MessageSquare, Clock, User, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { FollowUpLog, Customer, Loan } from '../types';
import { formatDate } from '../utils/loanCalculations';

interface FollowUpHistoryProps {
  followUps: FollowUpLog[];
  customers: Customer[];
  loans: Loan[];
  onOpenWhatsApp: (loan: Loan, customer: Customer, templateType: 'followup') => void;
  onOpenFollowUpModal: (loan: Loan, customer: Customer) => void;
  onOpenNewLoanModal: (preselectedCustomerId?: string) => void;
}

export const FollowUpHistory: React.FC<FollowUpHistoryProps> = ({
  followUps,
  customers,
  loans,
  onOpenWhatsApp,
  onOpenFollowUpModal,
  onOpenNewLoanModal,
}) => {
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const loanMap = useMemo(() => new Map(loans.map((l) => [l.id, l])), [loans]);

  const filtered = useMemo(() => {
    return followUps.filter((f) => {
      if (filterOutcome !== 'ALL' && f.outcome !== filterOutcome) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const customer = customerMap.get(f.customerId);
        const matchCust = f.customerName.toLowerCase().includes(q) || customer?.mobile.includes(q);
        const matchNotes = (f.notes || '').toLowerCase().includes(q);
        if (!matchCust && !matchNotes) return false;
      }
      return true;
    });
  }, [followUps, filterOutcome, searchTerm, customerMap]);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Office Outreach & Call Log History</h2>
          <p className="text-xs text-slate-500">
            Track call responses, customer loan interest, and scheduled callback appointments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Outcome */}
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Call Outcomes ({followUps.length})</option>
            <option value="Interested - Needs New Loan">Interested - Needs New Loan</option>
            <option value="Interested in Top-Up">Interested in Top-Up</option>
            <option value="Call Back Later">Call Back Later</option>
            <option value="Documents Pick-up Scheduled">Documents Pick-up Scheduled</option>
            <option value="Not Interested Currently">Not Interested Currently</option>
            <option value="Ringing / Not Reachable">Ringing / Not Reachable</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 space-y-2">
          <p className="text-sm font-semibold">No call records found</p>
          <p className="text-xs text-slate-400">
            When you call customers from the Re-Eligibility Radar, click "Log Call" to save the conversation outcome!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => {
            const customer = customerMap.get(log.customerId);
            const loan = log.loanId ? loanMap.get(log.loanId) : undefined;
            const isInterested = log.outcome.includes('Interested') || log.outcome.includes('Documents');

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{log.customerName}</span>
                    {customer && (
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {customer.mobile}
                      </span>
                    )}
                    {loan && (
                      <span className="text-xs text-slate-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium">
                        {loan.bankName} • {loan.loanType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Called on: {formatDate(log.date)}</span>
                  </div>
                </div>

                {/* Outcome badge & Notes */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isInterested
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : log.outcome.includes('Call Back')
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{log.outcome}</span>
                      </span>

                      {log.nextFollowUpDate && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          <Calendar className="w-3 h-3" />
                          <span>Next Callback: {formatDate(log.nextFollowUpDate)}</span>
                        </span>
                      )}
                    </div>

                    {log.notes && <p className="text-xs text-slate-700 italic">"{log.notes}"</p>}
                  </div>

                  {/* Quick follow-up action buttons */}
                  {customer && (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <a
                        href={`tel:${customer.mobile.replace(/\s+/g, '')}`}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title="Redial customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>

                      {loan && (
                        <button
                          onClick={() => onOpenWhatsApp(loan, customer, 'followup')}
                          className="p-1.5 text-slate-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors cursor-pointer"
                          title="WhatsApp follow-up"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isInterested && (
                        <button
                          onClick={() => onOpenNewLoanModal(customer.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                        >
                          <span>Process Loan</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
