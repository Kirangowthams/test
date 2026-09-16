import { Loan, ReEligibilityInfo, ReEligibilityTier } from '../types';

/**
 * Calculates monthly EMI using the standard reducing balance formula
 */
export function calculateEMI(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePercent <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualRatePercent / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  return Math.round(emi);
}

/**
 * Computes maturity date from disbursal date and tenure months
 */
export function calculateMaturityDate(disbursalDateStr: string, tenureMonths: number): string {
  if (!disbursalDateStr) return '';
  const date = new Date(disbursalDateStr);
  if (isNaN(date.getTime())) return '';
  
  // Add tenure in months
  date.setMonth(date.getMonth() + Number(tenureMonths));
  return date.toISOString().split('T')[0];
}

/**
 * Evaluates loan re-eligibility status against current date
 */
export function evaluateReEligibility(loan: Loan, referenceDate: Date = new Date()): ReEligibilityInfo {
  const disbursal = new Date(loan.disbursalDate);
  const maturity = new Date(loan.maturityDate || calculateMaturityDate(loan.disbursalDate, loan.tenureMonths));
  const refTime = referenceDate.getTime();
  const disbursalTime = disbursal.getTime();
  const maturityTime = maturity.getTime();

  // Total duration in days
  const totalDays = Math.max(1, Math.round((maturityTime - disbursalTime) / (1000 * 60 * 60 * 24)));
  const daysPassed = Math.round((refTime - disbursalTime) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.round((maturityTime - refTime) / (1000 * 60 * 60 * 24));

  // Percentage completed
  let percentCompleted = Math.round((daysPassed / totalDays) * 100);
  if (percentCompleted < 0) percentCompleted = 0;
  if (percentCompleted > 100) percentCompleted = 100;

  const totalMonths = loan.tenureMonths || 12;
  const monthsCompleted = Math.min(totalMonths, Math.max(0, Math.round((daysPassed / totalDays) * totalMonths)));
  const monthsRemaining = Math.max(0, totalMonths - monthsCompleted);

  // Determine Tier and Recommendation
  let tier: ReEligibilityTier = 'HEALTHY_ACTIVE';
  let recommendedAction = 'Loan running smoothly';
  let priorityScore = 10;
  // Estimated new loan or top-up capacity (typically 30% to 150% of original loan)
  let estimatedTopUpEligibleAmount = Math.round(loan.principalAmount * 0.4);

  if (daysRemaining <= 0 || loan.status === 'Completed') {
    tier = 'CRITICAL_CALL_NOW';
    const daysAgo = Math.abs(daysRemaining);
    recommendedAction = daysAgo === 0 
      ? 'Loan finishes today! Call now for repeat loan'
      : `Loan completed ${daysAgo} days ago! Call for fresh loan offer`;
    priorityScore = 100;
    estimatedTopUpEligibleAmount = Math.round(loan.principalAmount * 1.25);
  } else if (daysRemaining <= 15) {
    tier = 'CRITICAL_CALL_NOW';
    recommendedAction = `Matures in ${daysRemaining} days! Contact immediately for smooth renewal`;
    priorityScore = 95;
    estimatedTopUpEligibleAmount = Math.round(loan.principalAmount * 1.2);
  } else if (daysRemaining <= 60) {
    tier = 'UPCOMING_RENEWAL';
    recommendedAction = `Finishes in ~${Math.ceil(daysRemaining / 30)} month(s). Initiate document prep for new loan`;
    priorityScore = 80;
    estimatedTopUpEligibleAmount = Math.round(loan.principalAmount * 1.15);
  } else if (percentCompleted >= 60) {
    tier = 'TOP_UP_ELIGIBLE';
    recommendedAction = `Paid ${percentCompleted}% of tenure! Pre-qualified for Top-Up or parallel loan`;
    priorityScore = 65;
    estimatedTopUpEligibleAmount = Math.round(loan.principalAmount * 0.5);
  } else if (percentCompleted < 25) {
    tier = 'NEW_DISBURSAL';
    recommendedAction = 'Recently disbursed. Follow up on first EMI confirmation';
    priorityScore = 20;
    estimatedTopUpEligibleAmount = 0;
  }

  return {
    loanId: loan.id,
    customerId: loan.customerId,
    customerName: loan.customerName,
    customerMobile: loan.customerMobile,
    bankName: loan.bankName,
    loanType: loan.loanType,
    principalAmount: loan.principalAmount,
    disbursalDate: loan.disbursalDate,
    maturityDate: loan.maturityDate,
    totalTenureMonths: loan.tenureMonths,
    monthsCompleted,
    monthsRemaining,
    percentCompleted,
    daysRemaining,
    tier,
    recommendedAction,
    priorityScore,
    estimatedTopUpEligibleAmount,
  };
}

/**
 * Format currency in Indian Lakhs/Crores or standard format
 */
export function formatCurrency(amount: number, currency: string = '₹'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `${currency}0`;
  
  // Format with Indian thousands/lakhs separators if INR
  if (currency === '₹') {
    const isNegative = amount < 0;
    const abs = Math.abs(Math.round(amount));
    const str = abs.toString();
    
    if (str.length <= 3) {
      return `${isNegative ? '-' : ''}${currency}${str}`;
    }
    
    const lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    return `${isNegative ? '-' : ''}${currency}${formatted}`;
  }

  return `${currency}${Math.round(amount).toLocaleString()}`;
}

/**
 * Format date nicely for human display
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate a WhatsApp Web/App click-to-chat URL with pre-filled message
 */
export function generateWhatsAppLink(
  phone: string,
  customerName: string,
  bankName: string,
  loanType: string,
  principalAmount: number,
  officeName: string = "Our Loan Consultancy Office",
  templateType: 'completion' | 'topup' | 'renewal' | 'followup' = 'completion'
): string {
  // Clean phone number: remove spaces, dashes, etc.
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  // If 10 digits (standard Indian mobile), prepend 91
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const formattedAmount = formatCurrency(principalAmount);

  let message = '';
  if (templateType === 'completion') {
    message = `Hello ${customerName}, greetings from ${officeName}!\n\nWe noticed that your ${bankName} ${loanType} of ${formattedAmount} has successfully concluded. Congratulations on completing your loan tenure!\n\nAs our valued customer, you are now eligible for exclusive fresh loan offers with minimal documentation and preferential interest rates. If you or your family need any financial assistance, please let us know. We are happy to help!`;
  } else if (templateType === 'topup') {
    message = `Hello ${customerName}, hope you are doing well!\n\nGood news from ${officeName}: Based on your excellent track record on your ${bankName} ${loanType}, you are pre-approved for an instant Top-Up Loan or parallel facility with minimal paperwork.\n\nWould you like us to check your pre-approved limit and best bank rates today?`;
  } else if (templateType === 'renewal') {
    message = `Hello ${customerName}, this is from ${officeName}.\n\nYour ${bankName} ${loanType} is nearing its final maturity soon. We can arrange your next loan disbursement seamlessly so there is no gap in your funds. Please let us know when is a convenient time to discuss your upcoming financial plans.`;
  } else {
    message = `Hello ${customerName}, greetings from ${officeName}.\n\nFollowing up regarding our recent conversation about your loan requirements with ${bankName}. Please feel free to reply or call back whenever you are ready with the documents. Have a great day!`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
