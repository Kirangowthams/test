import { Customer, Loan } from '../types';

/**
 * Formats a phone number safely for Excel.
 * Using ="<phone>" forces Excel to treat the phone number strictly as text,
 * preventing Excel from converting 10-digit phone numbers into exponential
 * scientific notation (e.g. 9.59E+09).
 */
export function formatPhoneForExcel(phone: string): string {
  const clean = (phone || '').trim();
  if (!clean) return '""';
  return `"=""${clean.replace(/"/g, '')}"""`;
}

export function downloadCSV(filename: string, csvContent: string) {
  // Prepending UTF-8 Byte Order Mark (\uFEFF) ensures Microsoft Excel
  // on Windows opens the file with correct character encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports data to Excel with the exact 3 requested columns:
 * 1. Name
 * 2. Number
 * 3. Loan Type
 */
export function exportSimplifiedCallingList(loans: Loan[], customers?: Customer[]) {
  const headers = ['Name', 'Number', 'Loan Type'];
  const rows: string[][] = [];

  if (loans && loans.length > 0) {
    loans.forEach((loan) => {
      rows.push([
        `"${(loan.customerName || '').replace(/"/g, '""')}"`,
        formatPhoneForExcel(loan.customerMobile),
        `"${(loan.loanType || '').replace(/"/g, '""')}"`,
      ]);
    });
  }

  // If customers are provided, also include any customer without an active loan record
  if (customers && customers.length > 0) {
    const existingLoanCustomerNames = new Set(
      loans.map((l) => (l.customerName || '').trim().toLowerCase())
    );
    customers.forEach((c) => {
      if (!existingLoanCustomerNames.has((c.name || '').trim().toLowerCase())) {
        rows.push([
          `"${(c.name || '').replace(/"/g, '""')}"`,
          formatPhoneForExcel(c.mobile),
          `"General Customer"`,
        ]);
      }
    });
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`Galaxy_Consultancy_Calling_List_${dateStr}.csv`, csvContent);
}

/**
 * Primary export from Directory & Calling List
 */
export function exportLoansToCSV(loans: Loan[], customers: Customer[]) {
  exportSimplifiedCallingList(loans, customers);
}

/**
 * Calling list export from Re-Eligibility Radar
 */
export function exportReEligibilityReportCSV(loans: Loan[]) {
  exportSimplifiedCallingList(loans);
}

/**
 * Complete Full Portfolio Export for administrative backup
 */
export function exportFullPortfolioCSV(loans: Loan[], customers: Customer[]) {
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
    'Loan Status',
    'Notes',
  ];

  const rows = loans.map((loan) => {
    const customer = customerMap.get(loan.customerId);
    return [
      `"${loan.id}"`,
      `"${loan.customerName.replace(/"/g, '""')}"`,
      formatPhoneForExcel(loan.customerMobile),
      formatPhoneForExcel(customer?.alternatePhone || ''),
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
      loan.status,
      `"${(loan.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`Galaxy_Consultancy_Full_Portfolio_${dateStr}.csv`, csvContent);
}

