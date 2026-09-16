import React, { useState, useEffect } from 'react';
import { X, Calculator, Building2, User, DollarSign, Calendar, Percent } from 'lucide-react';
import { Customer, Loan, LoanType, EmploymentType, LoanStatus, CommissionStatus } from '../types';
import { calculateEMI, calculateMaturityDate, formatCurrency } from '../utils/loanCalculations';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLoan: (loanData: Partial<Loan>, newCustomerData?: Partial<Customer>) => Promise<void>;
  customers: Customer[];
  editingLoan?: Loan | null;
  preselectedCustomerId?: string;
}

export const LoanModal: React.FC<LoanModalProps> = ({
  isOpen,
  onClose,
  onSaveLoan,
  customers,
  editingLoan,
  preselectedCustomerId,
}) => {
  const [isNewCustomer, setIsNewCustomer] = useState<boolean>(false);

  // Customer Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custMobile, setCustMobile] = useState<string>('');
  const [custAltPhone, setCustAltPhone] = useState<string>('');
  const [custCity, setCustCity] = useState<string>('');
  const [custEmployment, setCustEmployment] = useState<EmploymentType>('Salaried');
  const [custIncome, setCustIncome] = useState<string>('');
  const [custNotes, setCustNotes] = useState<string>('');

  // Loan Fields
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [loanType, setLoanType] = useState<LoanType>('Personal Loan');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [principalAmount, setPrincipalAmount] = useState<string>('500000');
  const [interestRate, setInterestRate] = useState<string>('11.5');
  const [tenureMonths, setTenureMonths] = useState<string>('24');
  const [disbursalDate, setDisbursalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState<string>('');
  const [emiAmount, setEmiAmount] = useState<string>('');
  const [bankCommissionPercent, setBankCommissionPercent] = useState<string>('1.8');
  const [commissionAmount, setCommissionAmount] = useState<string>('');
  const [commissionStatus, setCommissionStatus] = useState<CommissionStatus>('Pending');
  const [status, setStatus] = useState<LoanStatus>('Active');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const bankOptions = [
    'HDFC Bank',
    'State Bank of India',
    'ICICI Bank',
    'Axis Bank',
    'Bajaj Finance',
    'Kotak Mahindra Bank',
    'Bank of Baroda',
    'Punjab National Bank',
    'Tata Capital',
    'IDFC First Bank',
    'Other Bank / NBFC',
  ];

  // Initialize form state
  useEffect(() => {
    if (!isOpen) return;

    if (editingLoan) {
      setIsNewCustomer(false);
      setSelectedCustomerId(editingLoan.customerId);
      setBankName(bankOptions.includes(editingLoan.bankName) ? editingLoan.bankName : 'Other Bank / NBFC');
      setCustomBankName(bankOptions.includes(editingLoan.bankName) ? '' : editingLoan.bankName);
      setLoanType(editingLoan.loanType);
      setAccountNumber(editingLoan.accountNumber);
      setPrincipalAmount(editingLoan.principalAmount.toString());
      setInterestRate(editingLoan.interestRate.toString());
      setTenureMonths(editingLoan.tenureMonths.toString());
      setDisbursalDate(editingLoan.disbursalDate);
      setMaturityDate(editingLoan.maturityDate);
      setEmiAmount(editingLoan.emiAmount.toString());
      setBankCommissionPercent(editingLoan.bankCommissionPercent.toString());
      setCommissionAmount(editingLoan.commissionAmount.toString());
      setCommissionStatus(editingLoan.commissionStatus);
      setStatus(editingLoan.status);
      setNotes(editingLoan.notes || '');
    } else {
      // New Loan
      if (preselectedCustomerId) {
        setIsNewCustomer(false);
        setSelectedCustomerId(preselectedCustomerId);
      } else if (customers.length > 0) {
        setIsNewCustomer(false);
        setSelectedCustomerId(customers[0].id);
      } else {
        setIsNewCustomer(true);
      }

      setCustName('');
      setCustMobile('');
      setCustAltPhone('');
      setCustCity('');
      setCustEmployment('Salaried');
      setCustIncome('');
      setCustNotes('');

      setBankName('HDFC Bank');
      setCustomBankName('');
      setLoanType('Personal Loan');
      setAccountNumber(`AC-${Math.floor(100000 + Math.random() * 900000)}`);
      setPrincipalAmount('500000');
      setInterestRate('11.5');
      setTenureMonths('24');
      const today = new Date().toISOString().split('T')[0];
      setDisbursalDate(today);
      setBankCommissionPercent('1.8');
      setCommissionStatus('Pending');
      setStatus('Active');
      setNotes('');
    }
  }, [isOpen, editingLoan, preselectedCustomerId, customers]);

  // Live auto-calculation of EMI, Maturity Date, and Commission Amount
  useEffect(() => {
    const p = parseFloat(principalAmount) || 0;
    const r = parseFloat(interestRate) || 0;
    const t = parseInt(tenureMonths) || 12;
    const commPct = parseFloat(bankCommissionPercent) || 0;

    const calculatedEmi = calculateEMI(p, r, t);
    setEmiAmount(calculatedEmi.toString());

    if (disbursalDate && t > 0) {
      const computedMaturity = calculateMaturityDate(disbursalDate, t);
      setMaturityDate(computedMaturity);
    }

    const computedComm = Math.round((p * commPct) / 100);
    setCommissionAmount(computedComm.toString());
  }, [principalAmount, interestRate, tenureMonths, disbursalDate, bankCommissionPercent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const finalBank = bankName === 'Other Bank / NBFC' ? customBankName || 'Other Bank' : bankName;

      let newCustPayload: Partial<Customer> | undefined;
      if (isNewCustomer && !editingLoan) {
        if (!custName.trim() || !custMobile.trim()) {
          alert('Please enter customer name and primary mobile number.');
          setSaving(false);
          return;
        }
        newCustPayload = {
          name: custName.trim(),
          mobile: custMobile.trim(),
          alternatePhone: custAltPhone.trim(),
          city: custCity.trim(),
          employmentType: custEmployment,
          monthlyIncome: parseFloat(custIncome) || 0,
          notes: custNotes.trim(),
        };
      }

      const loanPayload: Partial<Loan> = {
        customerId: isNewCustomer ? '' : selectedCustomerId,
        bankName: finalBank,
        loanType,
        accountNumber: accountNumber.trim(),
        principalAmount: parseFloat(principalAmount) || 0,
        interestRate: parseFloat(interestRate) || 0,
        tenureMonths: parseInt(tenureMonths) || 12,
        emiAmount: parseFloat(emiAmount) || 0,
        disbursalDate,
        maturityDate,
        bankCommissionPercent: parseFloat(bankCommissionPercent) || 0,
        commissionAmount: parseFloat(commissionAmount) || 0,
        commissionStatus,
        status,
        notes: notes.trim(),
      };

      await onSaveLoan(loanPayload, newCustPayload);
      onClose();
    } catch (err) {
      console.error('Failed to save loan:', err);
      alert('Error saving record. Please check the inputs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingLoan ? 'Edit Loan Record' : 'Record New Loan & Customer'}
            </h2>
            <p className="text-xs text-slate-500">
              Save customer details, bank commission %, and maturity date for automated re-eligibility alerts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* SECTION 1: CUSTOMER SELECTION OR NEW ENTRY */}
          {!editingLoan && (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Customer Selection</span>
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(false)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      !isNewCustomer
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer(true)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      isNewCustomer
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    + New Customer
                  </button>
                </div>
              </div>

              {!isNewCustomer ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Select Customer from Office Database
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.mobile} ({c.city || 'Client'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      required={isNewCustomer}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Primary Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      required={isNewCustomer}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Alternate Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={custAltPhone}
                      onChange={(e) => setCustAltPhone(e.target.value)}
                      placeholder="e.g. +91 94112 33445"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">City / Area</label>
                    <input
                      type="text"
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      placeholder="e.g. Mumbai, Surat, Delhi"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Employment / Business Type
                    </label>
                    <select
                      value={custEmployment}
                      onChange={(e) => setCustEmployment(e.target.value as EmploymentType)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Salaried">Salaried</option>
                      <option value="Self-Employed / Business">Self-Employed / Business</option>
                      <option value="Professional (Doctor/CA/Lawyer)">Professional (Doctor/CA/Lawyer)</option>
                      <option value="Trader / Merchant">Trader / Merchant</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Monthly Income (Approx)
                    </label>
                    <input
                      type="number"
                      value={custIncome}
                      onChange={(e) => setCustIncome(e.target.value)}
                      placeholder="e.g. 85000"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: BANK & LOAN FACILITY */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Loan & Bank Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank / NBFC Name *</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {bankOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {bankName === 'Other Bank / NBFC' && (
                  <input
                    type="text"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    placeholder="Enter Lender Name"
                    className="mt-1 w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loan Category *</label>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value as LoanType)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Business Loan">Business Loan</option>
                  <option value="Home Loan">Home Loan</option>
                  <option value="Loan Against Property (LAP)">Loan Against Property (LAP)</option>
                  <option value="Vehicle Loan">Vehicle Loan</option>
                  <option value="Gold Loan">Gold Loan</option>
                  <option value="Education Loan">Education Loan</option>
                  <option value="Micro Loan">Micro Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Loan Account / LAN No.
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. HDFC-PL-19203"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: FINANCIAL FIGURES & AUTO-CALCULATORS */}
          <div className="space-y-3 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
            <h3 className="text-xs font-bold text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Financials & Auto-Calculator</span>
              </span>
              <span className="text-[11px] font-semibold text-blue-700">
                Monthly EMI: {formatCurrency(parseFloat(emiAmount) || 0)}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Disbursed Principal Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    required
                    step="1000"
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Interest Rate (% p.a.) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    required
                    step="0.1"
                    className="w-full pr-7 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tenure (In Months) *
                </label>
                <input
                  type="number"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  required
                  min="1"
                  max="360"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Disbursal / Start Date *
                </label>
                <input
                  type="date"
                  value={disbursalDate}
                  onChange={(e) => setDisbursalDate(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Maturity / End Date (Auto)
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Current Loan Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LoanStatus)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Near Maturity">Near Maturity</option>
                  <option value="Completed">Completed / Finished</option>
                  <option value="Pre-Closed">Pre-Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: BANK COMMISSION (DAD'S PAYOUT) */}
          <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                <span>Dad's Office Bank Commission (Payout)</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-700">
                Earned: {formatCurrency(parseFloat(commissionAmount) || 0)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Bank Commission % (Payout)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={bankCommissionPercent}
                    onChange={(e) => setBankCommissionPercent(e.target.value)}
                    step="0.05"
                    className="w-full pr-7 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Payout Amount (Calculated)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    value={commissionAmount}
                    onChange={(e) => setCommissionAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Bank Payment Status
                </label>
                <select
                  value={commissionStatus}
                  onChange={(e) => setCommissionStatus(e.target.value as CommissionStatus)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Pending">Pending from Bank</option>
                  <option value="Received">Received / Cleared</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Office Notes / Future Loan Requirements
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer wants to take home loan after this personal loan finishes. Prompt payer."
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingLoan ? 'Update Loan Record' : 'Save Customer & Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
