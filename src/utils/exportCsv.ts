import { Customer, Loan } from '../types';
import { evaluateReEligibility } from './loanCalculations';

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportLoansToCSV(loans: Loan[], customers: Customer[]) {
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const headers = [
    'Loan ID',
    'Customer Name',
    'Mobile Number',
    'Alternate Phone',
    'City',
    'Bank Name',
    'Loan Type',
    'Account Number',
    'Principal Amount',
    'Interest Rate %',
    'Tenure (Months)',
    'Monthly EMI',
    'Disbursal Date',
    'Maturity Date',
    'Tenure Completed %',
    'Re-Eligibility Status',
    'Recommended Action',
    'Bank Commission %',
    'Commission Amount',
    'Commission Status',
    'Loan Status',
    'Notes',
  ];

  const rows = loans.map((loan) => {
    const customer = customerMap.get(loan.customerId);
    const re = evaluateReEligibility(loan);

    return [
      `"${loan.id}"`,
      `"${loan.customerName.replace(/"/g, '""')}"`,
      `"${loan.customerMobile}"`,
      `"${customer?.alternatePhone || ''}"`,
      `"${customer?.city || ''}"`,
      `"${loan.bankName.replace(/"/g, '""')}"`,
      `"${loan.loanType}"`,
      `"${loan.accountNumber}"`,
      loan.principalAmount,
      loan.interestRate,
      loan.tenureMonths,
      loan.emiAmount,
      loan.disbursalDate,
      loan.maturityDate,
      `${re.percentCompleted}%`,
      `"${re.tier.replace(/_/g, ' ')}"`,
      `"${re.recommendedAction.replace(/"/g, '""')}"`,
      loan.bankCommissionPercent,
      loan.commissionAmount,
      loan.commissionStatus,
      loan.status,
      `"${(loan.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`Galaxy_Consultancy_Portfolio_${dateStr}.csv`, csvContent);
}

export function exportReEligibilityReportCSV(loans: Loan[]) {
  const headers = [
    'Customer Name',
    'Mobile',
    'Bank',
    'Loan Type',
    'Original Amount',
    'Disbursal Date',
    'Maturity Date',
    'Days Remaining / Since Finish',
    'Re-Eligibility Tier',
    'Estimated New Limit / Top-Up',
    'Recommended Action',
  ];

  const rows = loans.map((loan) => {
    const re = evaluateReEligibility(loan);
    return [
      `"${loan.customerName.replace(/"/g, '""')}"`,
      `"${loan.customerMobile}"`,
      `"${loan.bankName}"`,
      `"${loan.loanType}"`,
      loan.principalAmount,
      loan.disbursalDate,
      loan.maturityDate,
      re.daysRemaining <= 0 ? `Finished ${Math.abs(re.daysRemaining)} days ago` : `${re.daysRemaining} days left`,
      `"${re.tier}"`,
      re.estimatedTopUpEligibleAmount,
      `"${re.recommendedAction.replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`Galaxy_Consultancy_Calling_List_${dateStr}.csv`, csvContent);
}
