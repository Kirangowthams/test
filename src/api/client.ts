import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

async function safeFetchJson<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const api = {
  // ===================== CUSTOMERS =====================
  async getCustomers(): Promise<Customer[]> {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      if (!snap.empty) {
        const list: Customer[] = [];
        snap.forEach((d) => list.push(d.data() as Customer));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        const current = getLocalBackup();
        saveLocalBackup({ ...current, customers: list });
        return list;
      } else {
        // Initial seed into Firestore so cloud database starts populated
        const seed = getInitialSeedData();
        const batch = writeBatch(db);
        seed.customers.forEach((c) => {
          batch.set(doc(db, 'customers', c.id), sanitizeForFirestore(c));
        });
        await batch.commit();
        const current = getLocalBackup();
        saveLocalBackup({ ...current, customers: seed.customers });
        return seed.customers;
      }
    } catch (err) {
      console.warn('Firestore getCustomers failed, attempting fallback:', err);
      try {
        const res = await fetch('/api/customers');
        if (res.ok) {
          const data = await safeFetchJson<Customer[]>(res);
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
      } catch {
        // network or server fallback failed
      }
      return getLocalBackup().customers;
    }
  },

  async createCustomer(payload: Partial<Customer>): Promise<Customer> {
    const newCust: Customer = {
      id: payload.id || `cust-${Date.now()}`,
      name: (payload.name || 'New Customer').trim(),
      mobile: (payload.mobile || '').trim(),
      alternatePhone: (payload.alternatePhone || '').trim(),
      email: (payload.email || '').trim(),
      address: (payload.address || '').trim(),
      city: (payload.city || '').trim(),
      employmentType: payload.employmentType || 'Salaried',
      monthlyIncome: Number(payload.monthlyIncome) || 0,
      panOrId: (payload.panOrId || '').trim().toUpperCase(),
      notes: (payload.notes || '').trim(),
      createdAt: payload.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    // 1. Save directly into Firestore database
    try {
      await setDoc(doc(db, 'customers', newCust.id), sanitizeForFirestore(newCust));
    } catch (err) {
      console.error('Error saving customer to Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, `customers/${newCust.id}`);
    }

    // 2. Keep local cache synchronized
    const local = getLocalBackup();
    local.customers = [newCust, ...local.customers.filter((c) => c.id !== newCust.id)];
    saveLocalBackup(local);

    // 3. Inform backend API in background if running
    try {
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return newCust;
  },

  async updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
    const local = getLocalBackup();
    const existing = local.customers.find((c) => c.id === id);
    const updated: Customer = {
      ...(existing || {}),
      ...payload,
      id,
      updatedAt: new Date().toISOString().split('T')[0],
    } as Customer;

    // 1. Update in Firestore database
    try {
      await setDoc(doc(db, 'customers', id), sanitizeForFirestore(updated), { merge: true });
    } catch (err) {
      console.error('Error updating customer in Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
    }

    // 2. Update local state
    const idx = local.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      local.customers[idx] = updated;
    } else {
      local.customers.unshift(updated);
    }
    saveLocalBackup(local);

    // 3. Inform backend in background
    try {
      fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return updated;
  },

  async deleteCustomer(id: string): Promise<void> {
    // 1. Delete customer from Firestore
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (err) {
      console.error('Error deleting customer from Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
    }

    // 2. Local state cleanup
    const local = getLocalBackup();
    local.customers = local.customers.filter((c) => c.id !== id);
    local.loans = local.loans.filter((l) => l.customerId !== id);
    local.followUps = local.followUps.filter((f) => f.customerId !== id);
    saveLocalBackup(local);

    // 3. Inform backend
    try {
      fetch(`/api/customers/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }
  },

  // ===================== LOANS =====================
  async getLoans(): Promise<Loan[]> {
    try {
      const snap = await getDocs(collection(db, 'loans'));
      if (!snap.empty) {
        const list: Loan[] = [];
        snap.forEach((d) => list.push(d.data() as Loan));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        const current = getLocalBackup();
        saveLocalBackup({ ...current, loans: list });
        return list;
      } else {
        const seed = getInitialSeedData();
        const batch = writeBatch(db);
        seed.loans.forEach((l) => {
          batch.set(doc(db, 'loans', l.id), sanitizeForFirestore(l));
        });
        await batch.commit();
        const current = getLocalBackup();
        saveLocalBackup({ ...current, loans: seed.loans });
        return seed.loans;
      }
    } catch (err) {
      console.warn('Firestore getLoans failed, using fallback:', err);
      try {
        const res = await fetch('/api/loans');
        if (res.ok) {
          const data = await safeFetchJson<Loan[]>(res);
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
      } catch {
        // ignore
      }
      return getLocalBackup().loans;
    }
  },

  async createLoan(payload: Partial<Loan>): Promise<Loan> {
    const local = getLocalBackup();
    const customer = local.customers.find((c) => c.id === payload.customerId);
    const newLoan: Loan = {
      id: payload.id || `loan-${Date.now()}`,
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
      createdAt: payload.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    try {
      await setDoc(doc(db, 'loans', newLoan.id), sanitizeForFirestore(newLoan));
    } catch (err) {
      console.error('Error saving loan to Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, `loans/${newLoan.id}`);
    }

    local.loans = [newLoan, ...local.loans.filter((l) => l.id !== newLoan.id)];
    saveLocalBackup(local);

    try {
      fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoan),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return newLoan;
  },

  async updateLoan(id: string, payload: Partial<Loan>): Promise<Loan> {
    const local = getLocalBackup();
    const existing = local.loans.find((l) => l.id === id);
    const updated: Loan = {
      ...(existing || {}),
      ...payload,
      id,
      updatedAt: new Date().toISOString().split('T')[0],
    } as Loan;

    try {
      await setDoc(doc(db, 'loans', id), sanitizeForFirestore(updated), { merge: true });
    } catch (err) {
      console.error('Error updating loan in Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `loans/${id}`);
    }

    const idx = local.loans.findIndex((l) => l.id === id);
    if (idx !== -1) {
      local.loans[idx] = updated;
    } else {
      local.loans.unshift(updated);
    }
    saveLocalBackup(local);

    try {
      fetch(`/api/loans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return updated;
  },

  async deleteLoan(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'loans', id));
    } catch (err) {
      console.error('Error deleting loan in Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `loans/${id}`);
    }

    const local = getLocalBackup();
    local.loans = local.loans.filter((l) => l.id !== id);
    saveLocalBackup(local);

    try {
      fetch(`/api/loans/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }
  },

  // ===================== FOLLOW-UPS =====================
  async getFollowUps(): Promise<FollowUpLog[]> {
    try {
      const snap = await getDocs(collection(db, 'followups'));
      if (!snap.empty) {
        const list: FollowUpLog[] = [];
        snap.forEach((d) => list.push(d.data() as FollowUpLog));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        const current = getLocalBackup();
        saveLocalBackup({ ...current, followUps: list });
        return list;
      } else {
        const seed = getInitialSeedData();
        const batch = writeBatch(db);
        seed.followUps.forEach((f) => {
          batch.set(doc(db, 'followups', f.id), sanitizeForFirestore(f));
        });
        await batch.commit();
        const current = getLocalBackup();
        saveLocalBackup({ ...current, followUps: seed.followUps });
        return seed.followUps;
      }
    } catch (err) {
      console.warn('Firestore getFollowUps failed:', err);
      try {
        const res = await fetch('/api/followups');
        if (res.ok) {
          const data = await safeFetchJson<FollowUpLog[]>(res);
          if (Array.isArray(data) && data.length > 0) {
            return data;
          }
        }
      } catch {
        // ignore
      }
      return getLocalBackup().followUps;
    }
  },

  async createFollowUp(payload: Partial<FollowUpLog>): Promise<FollowUpLog> {
    const local = getLocalBackup();
    const customer = local.customers.find((c) => c.id === payload.customerId);
    const newFu: FollowUpLog = {
      id: payload.id || `fu-${Date.now()}`,
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

    try {
      await setDoc(doc(db, 'followups', newFu.id), sanitizeForFirestore(newFu));
    } catch (err) {
      console.error('Error creating followup in Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, `followups/${newFu.id}`);
    }

    local.followUps.unshift(newFu);
    saveLocalBackup(local);

    try {
      fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFu),
      }).catch(() => {});
    } catch {
      // ignore
    }

    return newFu;
  },

  // ===================== RESET & IMPORT =====================
  async resetSeedData(): Promise<void> {
    const seed = getInitialSeedData();
    try {
      const batch = writeBatch(db);
      seed.customers.forEach((c) => batch.set(doc(db, 'customers', c.id), sanitizeForFirestore(c)));
      seed.loans.forEach((l) => batch.set(doc(db, 'loans', l.id), sanitizeForFirestore(l)));
      seed.followUps.forEach((f) => batch.set(doc(db, 'followups', f.id), sanitizeForFirestore(f)));
      await batch.commit();
    } catch (err) {
      console.warn('Firestore resetSeedData sync failed:', err);
    }
    saveLocalBackup(seed);
    try {
      await fetch('/api/reset-seed', { method: 'POST' });
    } catch {
      // ignore
    }
  },

  async importData(data: {
    customers: Customer[];
    loans: Loan[];
    followUps: FollowUpLog[];
  }): Promise<void> {
    try {
      const batch = writeBatch(db);
      (data.customers || []).forEach((c) =>
        batch.set(doc(db, 'customers', c.id), sanitizeForFirestore(c))
      );
      (data.loans || []).forEach((l) =>
        batch.set(doc(db, 'loans', l.id), sanitizeForFirestore(l))
      );
      (data.followUps || []).forEach((f) =>
        batch.set(doc(db, 'followups', f.id), sanitizeForFirestore(f))
      );
      await batch.commit();
    } catch (err) {
      console.warn('Firestore batch importData failed:', err);
    }
    saveLocalBackup(data);
    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // ignore
    }
  },
};
