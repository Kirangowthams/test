import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Briefcase } from 'lucide-react';
import { Customer, EmploymentType } from '../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (id: string, payload: Partial<Customer>) => Promise<void>;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customer, onSave }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Salaried');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [panOrId, setPanOrId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setMobile(customer.mobile);
      setAltPhone(customer.alternatePhone || '');
      setCity(customer.city || '');
      setAddress(customer.address || '');
      setEmploymentType(customer.employmentType);
      setMonthlyIncome(customer.monthlyIncome ? customer.monthlyIncome.toString() : '');
      setPanOrId(customer.panOrId || '');
      setNotes(customer.notes || '');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(customer.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        alternatePhone: altPhone.trim(),
        city: city.trim(),
        address: address.trim(),
        employmentType,
        monthlyIncome: parseFloat(monthlyIncome) || 0,
        panOrId: panOrId.trim().toUpperCase(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update customer details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Edit Customer Information</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Customer Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Primary Mobile *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alternate Mobile</label>
              <input
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">City / Area</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">PAN / ID Card No.</label>
              <input
                type="text"
                value={panOrId}
                onChange={(e) => setPanOrId(e.target.value)}
                placeholder="e.g. ABCPS1234F"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 uppercase font-mono font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Salaried" className="text-slate-900">Salaried</option>
                <option value="Self-Employed / Business" className="text-slate-900">Self-Employed / Business</option>
                <option value="Professional (Doctor/CA/Lawyer)" className="text-slate-900">Professional (Doctor/CA/Lawyer)</option>
                <option value="Trader / Merchant" className="text-slate-900">Trader / Merchant</option>
                <option value="Other" className="text-slate-900">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Income (₹)</label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Customer Profile Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prompt payer, owns a retail shop, looking for machinery loan next"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer font-bold shadow-2xs disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
