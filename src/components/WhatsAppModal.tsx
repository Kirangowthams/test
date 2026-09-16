import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Copy, Check, Sparkles } from 'lucide-react';
import { Customer, Loan } from '../types';
import { formatCurrency } from '../utils/loanCalculations';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  loan: Loan | null;
  initialTemplateType?: 'completion' | 'topup' | 'renewal' | 'followup';
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  customer,
  loan,
  initialTemplateType = 'completion',
}) => {
  const [templateType, setTemplateType] = useState<'completion' | 'topup' | 'renewal' | 'followup'>(initialTemplateType);
  const [officeName, setOfficeName] = useState<string>('Galaxy Consultancy');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setTemplateType(initialTemplateType);
  }, [initialTemplateType]);

  useEffect(() => {
    if (!customer || !loan) return;

    const formattedAmount = formatCurrency(loan.principalAmount);

    if (templateType === 'completion') {
      setMessage(
        `Hello ${customer.name}, greetings from ${officeName}!\n\n` +
          `We noticed that your ${loan.bankName} ${loan.loanType} of ${formattedAmount} has successfully concluded. Congratulations on completing your loan tenure!\n\n` +
          `As our valued client with an excellent track record, you are now pre-approved for exclusive fresh loan facilities with minimal documentation and special discounted interest rates.\n\n` +
          `If you or your family need any financial requirements or business capital, please feel free to call or reply to this message. We are delighted to assist you!`
      );
    } else if (templateType === 'renewal') {
      setMessage(
        `Hello ${customer.name}, greetings from ${officeName}!\n\n` +
          `Your ${loan.bankName} ${loan.loanType} is nearing its final maturity soon. We can arrange your next loan renewal seamlessly so there is no gap in your funds.\n\n` +
          `Would you like us to compare the latest low-interest bank schemes for you this week? Please let us know a convenient time to speak.`
      );
    } else if (templateType === 'topup') {
      setMessage(
        `Hello ${customer.name}, hope you are doing well!\n\n` +
          `Good news from ${officeName}: Based on your prompt repayment history on your ${loan.bankName} ${loan.loanType}, you qualify for an instant Top-Up Loan or parallel facility at attractive terms.\n\n` +
          `Would you like us to share the sanction limit and lowest rate options with you today?`
      );
    } else {
      setMessage(
        `Hello ${customer.name}, greetings from ${officeName}.\n\n` +
          `Following up regarding our recent conversation about your loan requirements. Whenever you are ready with your documents, feel free to call or message us. Have a wonderful day!`
      );
    }
  }, [customer, loan, templateType, officeName]);

  if (!isOpen || !customer || !loan) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    let cleanPhone = customer.mobile.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">WhatsApp Loan Offer Generator</h2>
              <p className="text-[11px] text-slate-500">
                To: <span className="font-semibold text-slate-700">{customer.name}</span> ({customer.mobile})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Template Choice Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              Select Message Template:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('completion')}
                className={`px-3 py-2 rounded-lg text-left transition-colors border cursor-pointer ${
                  templateType === 'completion'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🎉 Loan Finished (Renewal)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('renewal')}
                className={`px-3 py-2 rounded-lg text-left transition-colors border cursor-pointer ${
                  templateType === 'renewal'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ⏰ Matures Soon (Pre-Renewal)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('topup')}
                className={`px-3 py-2 rounded-lg text-left transition-colors border cursor-pointer ${
                  templateType === 'topup'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🚀 Top-Up Pre-Approval
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('followup')}
                className={`px-3 py-2 rounded-lg text-left transition-colors border cursor-pointer ${
                  templateType === 'followup'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                💬 General Follow-Up
              </button>
            </div>
          </div>

          {/* Office Name Setting */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Your Office / Consultancy Name
            </label>
            <input
              type="text"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              placeholder="e.g. Galaxy Consultancy"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
            />
          </div>

          {/* Editable Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600">
                Message Preview (You can edit before sending):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg font-bold shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
