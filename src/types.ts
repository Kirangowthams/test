export type LoanType =
  | 'Personal Loan'
  | 'Business Loan'
  | 'Home Loan'
  | 'Loan Against Property (LAP)'
  | 'Vehicle Loan'
  | 'Gold Loan'
  | 'Education Loan'
  | 'Micro Loan';

export type EmploymentType =
  | 'Salaried'
  | 'Self-Employed / Business'
  | 'Professional (Doctor/CA/Lawyer)'
  | 'Trader / Merchant'
  | 'Other';

export type LoanStatus = 'Active' | 'Near Maturity' | 'Completed' | 'Pre-Closed';

export type CommissionStatus = 'Pending' | 'Received';

export type ReEligibilityTier =
  | 'CRITICAL_CALL_NOW'    // Completed in past 90 days or completing in <= 15 days
  | 'UPCOMING_RENEWAL'     // Completing in 16 to 60 days
  | 'TOP_UP_ELIGIBLE'      // >= 60% tenure completed
  | 'HEALTHY_ACTIVE'       // 25% - 59% tenure completed
  | 'NEW_DISBURSAL';       // < 25% tenure completed

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  employmentType: EmploymentType;
  monthlyIncome?: number;
  panOrId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  bankName: string;
  loanType: LoanType;
  accountNumber: string;
  principalAmount: number;
  interestRate: number; // annual percentage, e.g. 11.5%
  tenureMonths: number; // in months
  emiAmount: number; // monthly installment
  disbursalDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  bankCommissionPercent: number; // e.g. 1.75%
  commissionAmount: number; // calculated principal * percent / 100
  commissionStatus: CommissionStatus;
  status: LoanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReEligibilityInfo {
  loanId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  bankName: string;
  loanType: LoanType;
  principalAmount: number;
  disbursalDate: string;
  maturityDate: string;
  totalTenureMonths: number;
  monthsCompleted: number;
  monthsRemaining: number;
  percentCompleted: number;
  daysRemaining: number; // negative means days since completed
  tier: ReEligibilityTier;
  recommendedAction: string;
  priorityScore: number; // higher = higher call urgency
  estimatedTopUpEligibleAmount: number;
  lastFollowUpDate?: string;
  lastFollowUpOutcome?: string;
}

export type FollowUpOutcome =
  | 'Interested - Needs New Loan'
  | 'Interested in Top-Up'
  | 'Wants Higher Amount'
  | 'Documents Pick-up Scheduled'
  | 'Call Back Later'
  | 'Ringing / Not Reachable'
  | 'Not Interested Currently'
  | 'Loan Already Taken Elsewhere';

export interface FollowUpLog {
  id: string;
  customerId: string;
  customerName: string;
  loanId: string;
  date: string;
  outcome: FollowUpOutcome;
  notes?: string;
  nextFollowUpDate?: string;
  agentName?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  loanId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  bankName: string;
  loanType: LoanType;
  message: string;
  type: 'matured' | 'maturing_soon' | 'top_up_ready' | 'callback_due';
  urgency: 'high' | 'medium' | 'info';
  date: string;
  read: boolean;
}

export interface DashboardStats {
  totalCustomers: number;
  totalLoans: number;
  activeLoansCount: number;
  completedLoansCount: number;
  totalDisbursedAmount: number;
  totalCommissionEarned: number;
  commissionReceived: number;
  commissionPending: number;
  urgentReEligibilityCount: number; // Loan ended or ending in <= 30 days
  topUpEligibleCount: number; // >= 60% tenure
  followUpsScheduledToday: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'advisor' | 'agent';
}

export interface AuthSession {
  user: UserAccount;
  token: string;
  loginTime: string;
}

export interface SecurityConfig {
  email: string;
  name: string;
  securityQuestion: string;
  recoveryKeyHint: string;
}
