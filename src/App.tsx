import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, Loan, FollowUpLog } from './types';
import { api } from './api/client';
import { evaluateReEligibility } from './utils/loanCalculations';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginView } from './components/LoginView';
import { SecurityModal } from './components/SecurityModal';

import { Header } from './components/Header';
import { ReEligibilityRadar } from './components/ReEligibilityRadar';
import { CustomerLoanDirectory } from './components/CustomerLoanDirectory';
import { FollowUpHistory } from './components/FollowUpHistory';
import { StatsOverview } from './components/StatsOverview';

import { LoanModal } from './components/LoanModal';
import { CustomerModal } from './components/CustomerModal';
import { FollowUpModal } from './components/FollowUpModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { BackupModal } from './components/BackupModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { CustomerPrintModal } from './components/CustomerPrintModal';

function MainApp() {
  const { session, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab & Search
  const [activeTab, setActiveTab] = useState<'radar' | 'directory' | 'followups' | 'analytics'>('radar');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState<boolean>(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isCustomerProfileModalOpen, setIsCustomerProfileModalOpen] = useState<boolean>(false);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<Customer | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printCustomer, setPrintCustomer] = useState<Customer | null>(null);

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState<boolean>(false);
  const [followUpLoan, setFollowUpLoan] = useState<Loan | null>(null);
  const [followUpCustomer, setFollowUpCustomer] = useState<Customer | null>(null);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppLoan, setWhatsAppLoan] = useState<Loan | null>(null);
  const [whatsAppCustomer, setWhatsAppCustomer] = useState<Customer | null>(null);
  const [whatsAppTemplateType, setWhatsAppTemplateType] = useState<'completion' | 'topup' | 'renewal' | 'followup'>('completion');

  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Fetch all records
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cList, lList, fList] = await Promise.all([
        api.getCustomers(),
        api.getLoans(),
        api.getFollowUps(),
      ]);
      setCustomers(cList);
      setLoans(lList);
      setFollowUps(fList);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived metrics for alerts
  const { urgentCount, totalPendingCommission } = useMemo(() => {
    let uCount = 0;
    let pendingComm = 0;

    loans.forEach((loan) => {
      const re = evaluateReEligibility(loan);
      if (re.tier === 'CRITICAL_CALL_NOW') {
        uCount++;
      }
      if (loan.commissionStatus === 'Pending') {
        pendingComm += loan.commissionAmount;
      }
    });

    return { urgentCount: uCount, totalPendingCommission: pendingComm };
  }, [loans]);

  // Handler: Save Loan (Create or Update)
  const handleSaveLoan = async (loanData: Partial<Loan>, newCustomerData?: Partial<Customer>) => {
    try {
      let targetCustomerId = loanData.customerId;

      // If new customer is being added alongside loan
      if (newCustomerData && !targetCustomerId) {
        const createdCust = await api.createCustomer(newCustomerData);
        targetCustomerId = createdCust.id;
        setCustomers((prev) => [createdCust, ...prev]);
      }

      if (editingLoan) {
        const updated = await api.updateLoan(editingLoan.id, {
          ...loanData,
          customerId: targetCustomerId,
        });
        setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const createdLoan = await api.createLoan({
          ...loanData,
          customerId: targetCustomerId,
        });
        setLoans((prev) => [createdLoan, ...prev]);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Handler: Delete Loan
  const handleDeleteLoan = async (loanId: string) => {
    if (confirm('Are you sure you want to delete this loan record?')) {
      try {
        await api.deleteLoan(loanId);
        setLoans((prev) => prev.filter((l) => l.id !== loanId));
      } catch (err) {
        console.error(err);
        alert('Failed to delete loan.');
      }
    }
  };

  // Handler: Toggle Bank Commission Payout Status
  const handleToggleCommissionStatus = async (loan: Loan) => {
    const nextStatus = loan.commissionStatus === 'Received' ? 'Pending' : 'Received';
    try {
      const updated = await api.updateLoan(loan.id, { commissionStatus: nextStatus });
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Save Follow-Up
  const handleSaveFollowUp = async (payload: Partial<FollowUpLog>) => {
    try {
      const newFu = await api.createFollowUp(payload);
      setFollowUps((prev) => [newFu, ...prev]);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Handler: Update Customer
  const handleSaveCustomer = async (id: string, payload: Partial<Customer>) => {
    try {
      const updated = await api.updateCustomer(id, payload);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      // Also update customerName/mobile in local loans state
      setLoans((prev) =>
        prev.map((l) =>
          l.customerId === id
            ? { ...l, customerName: updated.name, customerMobile: updated.mobile }
            : l
        )
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Handler: Reset Seed
  const handleResetSeed = async () => {
    await api.resetSeedData();
    await loadData();
  };

  // Handler: Import Data
  const handleImportData = async (data: {
    customers: Customer[];
    loans: Loan[];
    followUps: FollowUpLog[];
  }) => {
    await api.importData(data);
    await loadData();
  };

  // Modal Triggers
  const openNewLoanModal = (preselectId?: string) => {
    setEditingLoan(null);
    setPreselectedCustomerId(preselectId);
    setIsLoanModalOpen(true);
  };

  const openEditLoanModal = (loan: Loan) => {
    setEditingLoan(loan);
    setPreselectedCustomerId(loan.customerId);
    setIsLoanModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  const openCustomerProfileModal = (customer: Customer) => {
    setSelectedCustomerProfile(customer);
    setIsCustomerProfileModalOpen(true);
  };

  const openPrintCustomerModal = (customer: Customer) => {
    setPrintCustomer(customer);
    setIsPrintModalOpen(true);
  };

  const openFollowUpModal = (loan: Loan, customer: Customer) => {
    setFollowUpLoan(loan);
    setFollowUpCustomer(customer);
    setIsFollowUpModalOpen(true);
  };

  const openWhatsAppModal = (
    loan: Loan,
    customer: Customer,
    templateType: 'completion' | 'topup' | 'renewal' | 'followup' = 'completion'
  ) => {
    setWhatsAppLoan(loan);
    setWhatsAppCustomer(customer);
    setWhatsAppTemplateType(templateType);
    setIsWhatsAppModalOpen(true);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Verifying secure portal credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased flex flex-col transition-colors">
      {/* Header with Navigation and Search */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewLoanModal={() => openNewLoanModal()}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onLogout={logout}
        userName={session?.user?.name || "Dad's Office"}
        urgentCount={urgentCount}
        totalPendingCommission={totalPendingCommission}
        onRefresh={loadData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Connecting to database...</p>
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'radar' && (
              <ReEligibilityRadar
                loans={loans}
                customers={customers}
                searchQuery={searchQuery}
                onOpenWhatsApp={openWhatsAppModal}
                onOpenFollowUpModal={openFollowUpModal}
                onOpenNewLoanModal={openNewLoanModal}
                onPrintCustomer={openPrintCustomerModal}
                onViewCustomerProfile={openCustomerProfileModal}
              />
            )}

            {activeTab === 'directory' && (
              <CustomerLoanDirectory
                loans={loans}
                customers={customers}
                searchQuery={searchQuery}
                onEditLoan={openEditLoanModal}
                onDeleteLoan={handleDeleteLoan}
                onToggleCommissionStatus={handleToggleCommissionStatus}
                onOpenWhatsApp={openWhatsAppModal}
                onOpenFollowUpModal={openFollowUpModal}
                onOpenNewLoanModal={openNewLoanModal}
                onEditCustomer={openEditCustomerModal}
                onViewCustomerProfile={openCustomerProfileModal}
                onPrintCustomer={openPrintCustomerModal}
              />
            )}

            {activeTab === 'followups' && (
              <FollowUpHistory
                followUps={followUps}
                customers={customers}
                loans={loans}
                onOpenWhatsApp={(l, c) => openWhatsAppModal(l, c, 'followup')}
                onOpenFollowUpModal={openFollowUpModal}
                onOpenNewLoanModal={openNewLoanModal}
              />
            )}

            {activeTab === 'analytics' && (
              <StatsOverview
                loans={loans}
                customers={customers}
                onOpenNewLoanModal={() => openNewLoanModal()}
                onViewCustomerProfile={openCustomerProfileModal}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>Loan Re-Eligibility & Customer Tracker</strong> — Tailored for DSA offices and loan consultants.
          </p>
          <p className="text-slate-400">
            Never lose a repeat borrower • Direct bank commission tracking
          </p>
        </div>
      </footer>

      {/* MODALS */}
      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSaveLoan={handleSaveLoan}
        customers={customers}
        editingLoan={editingLoan}
        preselectedCustomerId={preselectedCustomerId}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />

      <CustomerProfileModal
        isOpen={isCustomerProfileModalOpen}
        onClose={() => setIsCustomerProfileModalOpen(false)}
        customer={selectedCustomerProfile}
        loans={loans}
        followUps={followUps}
        onOpenNewLoan={(customerId) => openNewLoanModal(customerId)}
        onOpenWhatsApp={(loan, customer, templateType) => openWhatsAppModal(loan, customer, templateType)}
        onOpenFollowUp={(loan, customer) => openFollowUpModal(loan, customer)}
        onEditCustomer={(customer) => openEditCustomerModal(customer)}
        onEditLoan={(loan) => openEditLoanModal(loan)}
        onPrintCustomer={openPrintCustomerModal}
      />

      <CustomerPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        customer={printCustomer}
        loans={loans}
        followUps={followUps}
        customers={customers}
        onSelectCustomer={setPrintCustomer}
      />

      <FollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        loan={followUpLoan}
        customer={followUpCustomer}
        onSaveFollowUp={handleSaveFollowUp}
      />

      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        customer={whatsAppCustomer}
        loan={whatsAppLoan}
        initialTemplateType={whatsAppTemplateType}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        loans={loans}
        customers={customers}
        followUps={followUps}
        onResetSeed={handleResetSeed}
        onImportData={handleImportData}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
