import React, { useRef } from 'react';
import { X, Database, Download, Upload, RefreshCw, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { Customer, Loan, FollowUpLog } from '../types';
import { exportLoansToCSV, exportReEligibilityReportCSV } from '../utils/exportCsv';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans: Loan[];
  customers: Customer[];
  followUps: FollowUpLog[];
  onResetSeed: () => Promise<void>;
  onImportData: (data: { customers: Customer[]; loans: Loan[]; followUps: FollowUpLog[] }) => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  loans,
  customers,
  followUps,
  onResetSeed,
  onImportData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    const backupData = {
      customers,
      loans,
      followUps,
      exportedAt: new Date().toISOString(),
      app: 'Galaxy Consultancy - Loan CRM',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Galaxy_Consultancy_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.customers) && Array.isArray(parsed.loans)) {
          if (confirm(`Import ${parsed.customers.length} customers and ${parsed.loans.length} loans? This will update current records.`)) {
            await onImportData({
              customers: parsed.customers,
              loans: parsed.loans,
              followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
            });
            alert('Database imported successfully!');
            onClose();
          }
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to read or parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (confirm('Reset database to demo sample customers and loans? Any newly added data will be overwritten.')) {
      await onResetSeed();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Database Backup & Excel Export</h2>
              <p className="text-[11px] text-slate-500">
                Safeguard Dad's customer contacts & export calling lists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Current Database Statistics */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">Current Saved Records</p>
              <p className="text-slate-500 text-[11px]">Stored on Server & Browser Cache</p>
            </div>
            <div className="text-right font-mono">
              <span className="font-bold text-blue-700">{customers.length}</span> Customers •{' '}
              <span className="font-bold text-indigo-700">{loans.length}</span> Loans
            </div>
          </div>

          {/* Section: Excel / CSV Exports */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Excel / Spreadsheet Exports
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => exportLoansToCSV(loans, customers)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Complete Loan Portfolio (.csv)</p>
                    <p className="text-[11px] text-slate-500">All customer details, bank names, EMIs, and commissions</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => exportReEligibilityReportCSV(loans)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Re-Eligibility Calling List (.csv)</p>
                    <p className="text-[11px] text-slate-500">Filtered list of clients ready for renewal & repeat loans</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Section: Full JSON Backup & Restore */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Complete Database Backup File
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadJSON}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download Backup</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Restore Backup</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Section: Reset Demo Data */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">Need to reset to default sample records?</span>
            <button
              onClick={handleReset}
              className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Sample Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
