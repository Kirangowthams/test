import { Customer, Loan, FollowUpLog } from '../types';

export function getInitialSeedData(): { customers: Customer[]; loans: Loan[]; followUps: FollowUpLog[] } {
  return {
    customers: [],
    loans: [],
    followUps: [],
  };
}
