import React, { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  Clock,
  Download,
  Filter,
  UserPlus,
  ArrowUpDown,
  Plus,
  User,
  Users,
  FileText,
  Eye,
  CreditCard,
  MapPin,
  Briefcase,
  Printer,
} from 'lucide-react';
import { Customer, Loan, LoanStatus, CommissionStatus } from '../types';
import { formatCurrency, formatDate, evaluateReEligibility } from '../utils/loanCalculations';
import { exportLoansToCSV } from '../utils/exportCsv';

interface CustomerLoanDirectoryProps {
  loans: Loan[];
  customers: Customer[];
  searchQuery: string;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => void;
  onToggleCommissionStatus: (loan: Loan) => void;
  onOpenWhatsApp: (loan: Loan, customer: Customer, templateType: 'completion' | 'topup' | 'renewal') => void;
  onOpenFollowUpModal: (loan: Loan, customer: Customer) => void;
  onOpenNewLoanModal: (preselectedCustomerId?: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onViewCustomerProfile: (customer: Customer) => void;
  onPrintCustomer?: (customer: Customer) => void;
}

export const CustomerLoanDirectory: React.FC<CustomerLoanDirectoryProps> = ({
  loans,
  customers,
  searchQuery,
  onEditLoan,
  onDeleteLoan,
  onToggleCommissionStatus,
  onOpenWhatsApp,
  onOpenFollowUpModal,
  onOpenNewLoanModal,
  onEditCustomer,
  onViewCustomerProfile,
  onPrintCustomer,
}) => {
  const [activeSubView, setActiveSubView] = useState<'loans' | 'customers'>('loans');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [commissionFilter, setCommissionFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'maturity' | 'name'>('maturity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const customerMap = useMemo(() => {
    return new Map<string, Customer>(customers.map((c) => [c.id, c]));
  }, [customers]);

  // Aggregate loans per customer for Customer Master View
  const customerStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalLoans: number;
        activeLoans: number;
        completedLoans: number;
        totalBorrowed: number;
        totalCommission: number;
        hasFinishedLoan: boolean;
        latestLoanDate: string;
      }
    >();

    customers.forEach((c) => {
      map.set(c.id, {
        totalLoans: 0,
        activeLoans: 0,
        completedLoans: 0,
        totalBorrowed: 0,
        totalCommission: 0,
        hasFinishedLoan: false,
        latestLoanDate: '',
      });
    });

    loans.forEach((loan) => {
      const stats = map.get(loan.customerId) || {
        totalLoans: 0,
        activeLoans: 0,
        completedLoans: 0,
        totalBorrowed: 0,
        totalCommission: 0,
        hasFinishedLoan: false,
        latestLoanDate: '',
      };

      stats.totalLoans++;
      stats.totalBorrowed += loan.principalAmount;
      stats.totalCommission += loan.commissionAmount;

      if (loan.status === 'Completed' || loan.status === 'Pre-Closed') {
        stats.completedLoans++;
        stats.hasFinishedLoan = true;
      } else {
        stats.activeLoans++;
        const re = evaluateReEligibility(loan);
        if (re.daysRemaining <= 0) {
          stats.hasFinishedLoan = true;
        }
      }

      if (!stats.latestLoanDate || new Date(loan.disbursalDate) > new Date(stats.latestLoanDate)) {
        stats.latestLoanDate = loan.disbursalDate;
      }

      map.set(loan.customerId, stats);
    });

    return map;
  }, [customers, loans]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.alternatePhone && c.alternatePhone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.panOrId && c.panOrId.toLowerCase().includes(q)) ||
        c.employmentType.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  // Extract distinct banks for filter dropdown
  const banksList = useMemo(() => {
    const set = new Set<string>();
    loans.forEach((l) => set.add(l.bankName));
    return Array.from(set).sort();
  }, [loans]);

  // Filtered & Sorted Loans
  const filteredLoans = useMemo(() => {
    return loans
      .filter((loan) => {
        const customer = customerMap.get(loan.customerId);

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCustomer =
            customer?.name.toLowerCase().includes(q) ||
            customer?.mobile.includes(q) ||
            customer?.city?.toLowerCase().includes(q);
          const matchLoan =
            loan.bankName.toLowerCase().includes(q) ||
            loan.accountNumber.toLowerCase().includes(q) ||
            loan.loanType.toLowerCase().includes(q);
          if (!matchCustomer && !matchLoan) return false;
        }

        // Bank Filter
        if (bankFilter !== 'ALL' && loan.bankName !== bankFilter) return false;

        // Type Filter
        if (typeFilter !== 'ALL' && loan.loanType !== typeFilter) return false;

        // Status Filter
        if (statusFilter !== 'ALL' && loan.status !== statusFilter) return false;

        // Commission Status Filter
        if (commissionFilter !== 'ALL' && loan.commissionStatus !== commissionFilter) return false;

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'amount') {
          comparison = a.principalAmount - b.principalAmount;
        } else if (sortBy === 'date') {
          comparison = new Date(a.disbursalDate).getTime() - new Date(b.disbursalDate).getTime();
        } else if (sortBy === 'maturity') {
          comparison = new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
        } else if (sortBy === 'name') {
          comparison = a.customerName.localeCompare(b.customerName);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [loans, customerMap, searchQuery, bankFilter, typeFilter, statusFilter, commissionFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'amount' | 'maturity' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toggle: Loan Files vs Customer Profiles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            id="view-subview-loans-btn"
            onClick={() => setActiveSubView('loans')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'loans'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Loan Files Directory ({loans.length})</span>
          </button>

          <button
            id="view-subview-customers-btn"
            onClick={() => setActiveSubView('customers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'customers'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Profiles ({customers.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="export-loans-csv-btn"
            onClick={() => exportLoansToCSV(loans, customers)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Download clean Excel calling list containing Name, Mobile Number, and Loan Type"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export to Excel (Name, Number, Loan Type)</span>
          </button>

          <button
            id="directory-add-loan-btn"
            onClick={() => onOpenNewLoanModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Loan Record</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CUSTOMER PROFILES DIRECTORY */}
      {activeSubView === 'customers' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Directory & Lifetime Value</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Total registered clients: <strong>{customers.length}</strong> • Showing <strong>{filteredCustomers.length}</strong> after search
              </p>
            </div>
            <span className="text-[11px] text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
              Click any customer name to view complete profile and loan history
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-3">Contact & Location</th>
                  <th className="py-3 px-3">Employment & Income</th>
                  <th className="py-3 px-3">Loan Files (Active / Closed)</th>
                  <th className="py-3 px-3">Total Borrowed</th>
                  <th className="py-3 px-3">Office Commission</th>
                  <th className="py-3 px-3">Repeat Loan Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No customer matches the search query "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const cStats = customerStatsMap.get(cust.id) || {
                      totalLoans: 0,
                      activeLoans: 0,
                      completedLoans: 0,
                      totalBorrowed: 0,
                      totalCommission: 0,
                      hasFinishedLoan: false,
                      latestLoanDate: '',
                    };

                    const custLoans = loans.filter((l) => l.customerId === cust.id);
                    const primaryLoan = custLoans[0];

                    return (
                      <tr
                        key={cust.id}
                        id={`customer-row-${cust.id}`}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Name & ID */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {cust.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <button
                                onClick={() => onViewCustomerProfile(cust)}
                                className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1 group-hover:underline"
                              >
                                <span>{cust.name}</span>
                                <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                              </button>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {cust.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <a
                              href={`tel:${cust.mobile.replace(/\s+/g, '')}`}
                              className="font-mono text-slate-800 font-semibold hover:text-blue-600 block"
                            >
                              {cust.mobile}
                            </a>
                            {cust.alternatePhone && (
                              <p className="font-mono text-[10px] text-slate-400">Alt: {cust.alternatePhone}</p>
                            )}
                            {cust.city && (
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                <span>{cust.city}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Employment & Income */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-800">{cust.employmentType}</p>
                            <p className="text-[10px] text-slate-500">
                              {cust.monthlyIncome ? `₹${cust.monthlyIncome.toLocaleString('en-IN')}/mo` : 'Income N/A'}
                            </p>
                            {cust.panOrId && (
                              <p className="font-mono text-[10px] text-slate-400">PAN: {cust.panOrId}</p>
                            )}
                          </div>
                        </td>

                        {/* Loans Count */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900">
                              {cStats.totalLoans} {cStats.totalLoans === 1 ? 'Loan File' : 'Loan Files'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-blue-700 font-medium">{cStats.activeLoans} Active</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">{cStats.completedLoans} Completed</span>
                            </div>
                          </div>
                        </td>

                        {/* Total Disbursed */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{formatCurrency(cStats.totalBorrowed)}</p>
                          {cStats.latestLoanDate && (
                            <p className="text-[10px] text-slate-400">Latest: {formatDate(cStats.latestLoanDate)}</p>
                          )}
                        </td>

                        {/* Commission */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-emerald-700">{formatCurrency(cStats.totalCommission)}</p>
                          <p className="text-[10px] text-slate-400">Earned by office</p>
                        </td>

                        {/* Repeat Status */}
                        <td className="py-3 px-3">
                          {cStats.hasFinishedLoan ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              Ready for Repeat Loan!
                            </span>
                          ) : cStats.activeLoans > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active Running Loan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              No Active Files
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`view-profile-btn-${cust.id}`}
                              onClick={() => onViewCustomerProfile(cust)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 cursor-pointer"
                            >
                              View Details
                            </button>

                            {onPrintCustomer && (
                              <button
                                id={`print-customer-btn-${cust.id}`}
                                onClick={() => onPrintCustomer(cust)}
                                title="Print Single-Page Customer Dossier"
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <a
                              href={`tel:${cust.mobile.replace(/\s+/g, '')}`}
                              title="Call Customer"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                            {primaryLoan && (
                              <button
                                onClick={() => onOpenWhatsApp(primaryLoan, cust, cStats.hasFinishedLoan ? 'completion' : 'topup')}
                                title="Send WhatsApp Message"
                                className="p-1.5 text-slate-500 hover:text-green-700 hover:bg-green-50 rounded cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onOpenNewLoanModal(cust.id)}
                              title="Add New Loan for this customer"
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onEditCustomer(cust)}
                              title="Edit Customer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: LOAN FILES DIRECTORY TABLE */
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Filters & Search</span>
                <span className="text-xs text-slate-400 font-medium">({filteredLoans.length} records)</span>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              {/* Bank Filter */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Bank</label>
                <select
                  id="filter-bank"
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Partner Banks</option>
                  {banksList.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loan Type */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Loan Type</label>
                <select
                  id="filter-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Loan Types</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Business Loan">Business Loan</option>
                  <option value="Home Loan">Home Loan</option>
                  <option value="Loan Against Property (LAP)">Loan Against Property (LAP)</option>
                  <option value="Vehicle Loan">Vehicle Loan</option>
                  <option value="Gold Loan">Gold Loan</option>
                  <option value="Education Loan">Education Loan</option>
                </select>
              </div>

              {/* Loan Status */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Loan Status</label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Near Maturity">Near Maturity</option>
                  <option value="Completed">Completed / Closed</option>
                  <option value="Pre-Closed">Pre-Closed</option>
                </select>
              </div>

              {/* Bank Commission */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Bank Payout</label>
                <select
                  id="filter-commission"
                  value={commissionFilter}
                  onChange={(e) => setCommissionFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Payouts</option>
                  <option value="Pending">Pending from Bank</option>
                  <option value="Received">Received / Cleared</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th
                      onClick={() => toggleSort('name')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Customer & Contact</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3">Bank & Facility</th>
                    <th
                      onClick={() => toggleSort('amount')}
                      className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Disbursed (EMI)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('maturity')}
                      className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <span>Maturity Timeline</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3">Office Commission</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No loans match the current filters or search terms.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const customer = customerMap.get(loan.customerId);
                      const re = evaluateReEligibility(loan);
                      const isFinished = re.daysRemaining <= 0 || loan.status === 'Completed';

                      return (
                        <tr
                          key={loan.id}
                          id={`directory-row-${loan.id}`}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Customer Info */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => customer && onViewCustomerProfile(customer)}
                                  className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer flex items-center gap-1 group-hover:underline"
                                  title="View Customer Full Profile"
                                >
                                  <span>{loan.customerName}</span>
                                  <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                                </button>
                                {customer && (
                                  <button
                                    onClick={() => onEditCustomer(customer)}
                                    title="Edit Customer Details"
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                                <a href={`tel:${loan.customerMobile.replace(/\s+/g, '')}`} className="hover:underline">
                                  {loan.customerMobile}
                                </a>
                                {customer?.city && (
                                  <span className="font-sans text-[10px] text-slate-400">({customer.city})</span>
                                )}
                              </div>
                              {customer?.employmentType && (
                                <span className="text-[10px] text-slate-500 font-medium">{customer.employmentType}</span>
                              )}
                            </div>
                          </td>

                          {/* Bank & Type */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {loan.bankName}
                              </p>
                              <p className="text-[11px] text-slate-500">{loan.loanType}</p>
                              <p className="font-mono text-[10px] text-slate-400">A/C: {loan.accountNumber}</p>
                            </div>
                          </td>

                          {/* Disbursed Amount & EMI */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900">{formatCurrency(loan.principalAmount)}</p>
                              <p className="text-[11px] text-slate-600">
                                EMI: <strong className="text-slate-800">{formatCurrency(loan.emiAmount)}</strong>
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {loan.interestRate}% p.a. • {loan.tenureMonths} Mo
                              </p>
                            </div>
                          </td>

                          {/* Maturity & Re-eligibility */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <p className="font-medium text-slate-700">{formatDate(loan.maturityDate)}</p>
                              {isFinished ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                  Matured (Ready to Renew)
                                </span>
                              ) : re.daysRemaining <= 30 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Ends in {re.daysRemaining}d
                                </span>
                              ) : re.percentCompleted >= 60 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {re.percentCompleted}% Paid (Top-up Ready)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {re.percentCompleted}% ({re.monthsRemaining} mo left)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Bank Commission Payout */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <p className="font-bold text-slate-900">
                                {formatCurrency(loan.commissionAmount)}
                                <span className="text-[10px] font-normal text-slate-500 ml-1">
                                  ({loan.bankCommissionPercent}%)
                                </span>
                              </p>
                              <button
                                id={`toggle-commission-${loan.id}`}
                                onClick={() => onToggleCommissionStatus(loan)}
                                title="Click to toggle between Pending & Received"
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                  loan.commissionStatus === 'Received'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                {loan.commissionStatus === 'Received' ? (
                                  <>
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Paid / Cleared</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>Pending from Bank</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                loan.status === 'Completed'
                                  ? 'bg-slate-100 text-slate-700'
                                  : loan.status === 'Near Maturity'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {loan.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Profile */}
                              {customer && (
                                <button
                                  onClick={() => onViewCustomerProfile(customer)}
                                  title="View Customer Profile & History"
                                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Print Single-Page Customer Sheet */}
                              {customer && onPrintCustomer && (
                                <button
                                  id={`print-loan-cust-${loan.id}`}
                                  onClick={() => onPrintCustomer(customer)}
                                  title="Print Single-Page Customer Dossier"
                                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Quick Dial */}
                              <a
                                href={`tel:${loan.customerMobile.replace(/\s+/g, '')}`}
                                title="Call customer"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>

                              {/* WhatsApp */}
                              {customer && (
                                <button
                                  onClick={() => onOpenWhatsApp(loan, customer, isFinished ? 'completion' : 'topup')}
                                  title="Send WhatsApp message"
                                  className="p-1.5 text-slate-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit Loan */}
                              <button
                                id={`edit-loan-${loan.id}`}
                                onClick={() => onEditLoan(loan)}
                                title="Edit Loan Details"
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Repeat Loan for Same Customer */}
                              <button
                                onClick={() => onOpenNewLoanModal(loan.customerId)}
                                title="Issue another loan for this customer"
                                className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Loan */}
                              <button
                                id={`delete-loan-${loan.id}`}
                                onClick={() => onDeleteLoan(loan.id)}
                                title="Delete Loan"
                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
