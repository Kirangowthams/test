import { Customer, Loan, FollowUpLog } from '../types';
import { getInitialSeedData } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'loan_consultancy_offline_backup';

function getLocalBackup(): { customers: Customer[]; loans: Loan[]; followUps: FollowUpLog[] } {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.customers) && Array.isArray(parsed.loans)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading localStorage backup:', err);
  }
  return getInitialSeedData();
}

function saveLocalBackup(data: { customers: Customer[]; loans: Loan[]; followUps: FollowUpLog[] }) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving localStorage backup:', err);
  }
}

export const api = {
  async getCustomers(): Promise<Customer[]> {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        const current = getLocalBackup();
        saveLocalBackup({ ...current, customers: data });
        return data;
      }
    } catch (e) {
      console.warn('Backend fetch failed, using local cache:', e);
    }
    return getLocalBackup().customers;
  },

  async createCustomer(payload: Partial<Customer>): Promise<Customer> {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend post failed, creating locally:', e);
    }

    const local = getLocalBackup();
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: payload.name || 'New Customer',
      mobile: payload.mobile || '',
      alternatePhone: payload.alternatePhone || '',
      email: payload.email || '',
      address: payload.address || '',
      city: payload.city || '',
      employmentType: payload.employmentType || 'Salaried',
      monthlyIncome: payload.monthlyIncome || 0,
      panOrId: payload.panOrId || '',
      notes: payload.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    local.customers.unshift(newCust);
    saveLocalBackup(local);
    return newCust;
  },

  async updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend put failed, updating locally:', e);
    }

    const local = getLocalBackup();
    const idx = local.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      local.customers[idx] = { ...local.customers[idx], ...payload, updatedAt: new Date().toISOString().split('T')[0] };
      saveLocalBackup(local);
      return local.customers[idx];
    }
    throw new Error('Customer not found');
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend delete failed:', e);
    }
    const local = getLocalBackup();
    local.customers = local.customers.filter((c) => c.id !== id);
    local.loans = local.loans.filter((l) => l.customerId !== id);
    saveLocalBackup(local);
  },

  async getLoans(): Promise<Loan[]> {
    try {
      const res = await fetch('/api/loans');
      if (res.ok) {
        const data = await res.json();
        const current = getLocalBackup();
        saveLocalBackup({ ...current, loans: data });
        return data;
      }
    } catch (e) {
      console.warn('Backend fetch failed, using local cache:', e);
    }
    return getLocalBackup().loans;
  },

  async createLoan(payload: Partial<Loan>): Promise<Loan> {
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend post loan failed, fallback local:', e);
    }

    const local = getLocalBackup();
    const customer = local.customers.find((c) => c.id === payload.customerId);
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      customerId: payload.customerId || '',
      customerName: customer ? customer.name : payload.customerName || '',
      customerMobile: customer ? customer.mobile : payload.customerMobile || '',
      bankName: payload.bankName || 'Bank',
      loanType: payload.loanType || 'Personal Loan',
      accountNumber: payload.accountNumber || `AC-${Math.floor(100000 + Math.random() * 900000)}`,
      principalAmount: Number(payload.principalAmount) || 0,
      interestRate: Number(payload.interestRate) || 0,
      tenureMonths: Number(payload.tenureMonths) || 12,
      emiAmount: Number(payload.emiAmount) || 0,
      disbursalDate: payload.disbursalDate || new Date().toISOString().split('T')[0],
      maturityDate: payload.maturityDate || new Date().toISOString().split('T')[0],
      bankCommissionPercent: Number(payload.bankCommissionPercent) || 0,
      commissionAmount: Number(payload.commissionAmount) || 0,
      commissionStatus: payload.commissionStatus || 'Pending',
      status: payload.status || 'Active',
      notes: payload.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    local.loans.unshift(newLoan);
    saveLocalBackup(local);
    return newLoan;
  },

  async updateLoan(id: string, payload: Partial<Loan>): Promise<Loan> {
    try {
      const res = await fetch(`/api/loans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend put loan failed:', e);
    }

    const local = getLocalBackup();
    const idx = local.loans.findIndex((l) => l.id === id);
    if (idx !== -1) {
      local.loans[idx] = { ...local.loans[idx], ...payload, updatedAt: new Date().toISOString().split('T')[0] };
      saveLocalBackup(local);
      return local.loans[idx];
    }
    throw new Error('Loan not found');
  },

  async deleteLoan(id: string): Promise<void> {
    try {
      await fetch(`/api/loans/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend delete loan failed:', e);
    }
    const local = getLocalBackup();
    local.loans = local.loans.filter((l) => l.id !== id);
    saveLocalBackup(local);
  },

  async getFollowUps(): Promise<FollowUpLog[]> {
    try {
      const res = await fetch('/api/followups');
      if (res.ok) {
        const data = await res.json();
        const current = getLocalBackup();
        saveLocalBackup({ ...current, followUps: data });
        return data;
      }
    } catch (e) {
      console.warn('Backend fetch followups failed:', e);
    }
    return getLocalBackup().followUps;
  },

  async createFollowUp(payload: Partial<FollowUpLog>): Promise<FollowUpLog> {
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend create followup failed:', e);
    }

    const local = getLocalBackup();
    const customer = local.customers.find((c) => c.id === payload.customerId);
    const newFu: FollowUpLog = {
      id: `fu-${Date.now()}`,
      customerId: payload.customerId || '',
      customerName: customer ? customer.name : payload.customerName || 'Customer',
      loanId: payload.loanId || '',
      date: payload.date || new Date().toISOString().split('T')[0],
      outcome: payload.outcome || 'Interested - Needs New Loan',
      notes: payload.notes || '',
      nextFollowUpDate: payload.nextFollowUpDate || '',
      agentName: payload.agentName || "Dad's Desk",
      createdAt: new Date().toISOString().split('T')[0],
    };
    local.followUps.unshift(newFu);
    saveLocalBackup(local);
    return newFu;
  },

  async resetSeedData(): Promise<void> {
    try {
      await fetch('/api/reset-seed', { method: 'POST' });
    } catch (e) {
      console.warn('Backend reset failed, using local reset:', e);
    }
    const seed = getInitialSeedData();
    saveLocalBackup(seed);
  },

  async importData(data: { customers: Customer[]; loans: Loan[]; followUps: FollowUpLog[] }): Promise<void> {
    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.warn('Backend import failed, importing locally:', e);
    }
    saveLocalBackup(data);
  },
};
