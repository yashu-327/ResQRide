import React, { useState } from 'react';
import { AdminUser } from '../../types';
import {
  Building2,
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  FileCheck,
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUser) => void;
  onNavigateToPublic?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onNavigateToPublic,
}) => {
  const [adminId, setAdminId] = useState('RTO-OFFICER-44');
  const [pin, setPin] = useState('2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      // Prototype authentication check
      if (
        (adminId.trim().toUpperCase() === 'RTO-OFFICER-44' ||
          adminId.trim().toLowerCase().includes('rto') ||
          adminId.trim().toLowerCase().includes('admin')) &&
        pin === '2026'
      ) {
        onLoginSuccess({
          id: 'ADM-044',
          name: 'Deputy Commissioner V. Sharma',
          department: 'Road Safety & Motor Vehicles Administration',
          role: 'government_admin',
          rtoZone: 'RTO-DL-NORTH-01',
          email: 'admin.sharma@transport.gov.in',
        });
      } else {
        setError('Invalid admin credentials. Use the demo credentials provided below.');
        setLoading(false);
      }
    }, 400);
  };

  const handleQuickDemoFill = () => {
    setAdminId('RTO-OFFICER-44');
    setPin('2026');
    setError(null);
    onLoginSuccess({
      id: 'ADM-044',
      name: 'Deputy Commissioner V. Sharma',
      department: 'Road Safety & Motor Vehicles Administration',
      role: 'government_admin',
      rtoZone: 'RTO-DL-NORTH-01',
      email: 'admin.sharma@transport.gov.in',
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden border-b-4 border-slate-600">
          <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-slate-700/50">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-full border border-slate-700 mb-2">
            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Ministry of Transport • Vehicle Registry</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Government / Admin Portal
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Authorized portal for transport officers, vehicle registration, and emergency QR sticker issuance.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Demo Credentials Quick Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Prototype Demo Credentials</span>
              </span>
              <span className="text-[10px] bg-amber-200/70 text-amber-900 font-mono px-2 py-0.5 rounded font-semibold">
                Auto-Fill Ready
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-white p-2 rounded-xl border border-amber-200/80 text-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Admin Officer ID</span>
                <span className="font-bold">RTO-OFFICER-44</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Access PIN</span>
                <span className="font-bold">2026</span>
              </div>
            </div>
            <button
              type="button"
              id="btn-quick-admin-demo-login"
              onClick={handleQuickDemoFill}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>1-Click Demo Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="adminId"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Government Officer ID
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="adminId"
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. RTO-OFFICER-44"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="adminPin"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Administrative Security PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="adminPin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-admin-login"
              disabled={loading}
              className="w-full min-h-[48px] bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{loading ? 'Verifying Credentials...' : 'Sign In to Government Portal'}</span>
            </button>
          </form>

          {/* Security Notice & Public Portal Link */}
          <div className="pt-2 text-center space-y-3">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Protected Route • Transport Authority Personnel Only</span>
            </p>

            {onNavigateToPublic && (
              <button
                type="button"
                onClick={onNavigateToPublic}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
              >
                ← Return to Public Bystander Emergency Portal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
