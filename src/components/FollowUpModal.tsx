import React, { useState } from 'react';
import { X, PhoneCall, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { Customer, Loan, FollowUpOutcome, FollowUpLog } from '../types';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  customer: Customer | null;
  onSaveFollowUp: (payload: Partial<FollowUpLog>) => Promise<void>;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  loan,
  customer,
  onSaveFollowUp,
}) => {
  const [outcome, setOutcome] = useState<FollowUpOutcome>('Interested - Needs New Loan');
  const [notes, setNotes] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveFollowUp({
        customerId: customer.id,
        loanId: loan?.id || '',
        outcome,
        notes: notes.trim(),
        nextFollowUpDate: nextFollowUpDate || undefined,
        agentName: "Dad's Office Desk",
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to log call outcome.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Log Call / Follow-Up</h2>
              <p className="text-[11px] text-slate-500">{customer.name} ({customer.mobile})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {loan && (
            <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 text-slate-700">
              <p className="font-semibold text-blue-900 text-xs">{loan.bankName} • {loan.loanType}</p>
              <p className="text-[11px] text-slate-500">Maturity Date: {loan.maturityDate}</p>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Call Response / Outcome *
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as FollowUpOutcome)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Interested - Needs New Loan">🌟 Interested - Needs New Loan</option>
              <option value="Interested in Top-Up">⚡ Interested in Top-Up</option>
              <option value="Wants Higher Amount">💰 Wants Higher Amount</option>
              <option value="Documents Pick-up Scheduled">📁 Documents Pick-up Scheduled</option>
              <option value="Call Back Later">⏰ Call Back Later</option>
              <option value="Ringing / Not Reachable">📴 Ringing / Not Reachable</option>
              <option value="Not Interested Currently">🚫 Not Interested Currently</option>
              <option value="Loan Already Taken Elsewhere">⚠️ Loan Already Taken Elsewhere</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Next Callback Date (Optional)
            </label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Call Conversation Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer is expanding business, needs 10L loan in 15 days. Send SBI and HDFC quotation."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Call Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
