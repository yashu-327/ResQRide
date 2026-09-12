import React, { useState } from 'react';
import { OperatorUser } from '../../types';
import {
  Truck,
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  PhoneCall,
  Activity,
} from 'lucide-react';

interface AmbulanceLoginProps {
  onLoginSuccess: (user: OperatorUser) => void;
  onNavigateToPublic?: () => void;
}

export const AmbulanceLogin: React.FC<AmbulanceLoginProps> = ({
  onLoginSuccess,
  onNavigateToPublic,
}) => {
  const [operatorId, setOperatorId] = useState('EMS-4102');
  const [pin, setPin] = useState('108');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      // Prototype authentication check
      if (
        (operatorId.trim().toUpperCase() === 'EMS-4102' ||
          operatorId.trim().toLowerCase().includes('ems') ||
          operatorId.trim().toLowerCase().includes('paramedic')) &&
        pin === '108'
      ) {
        onLoginSuccess({
          id: 'OP-4102',
          name: 'Officer Rajesh Kumar',
          badgeNumber: 'EMS-4102',
          station: 'Central EMS Response Unit 01',
          role: 'ambulance_operator',
          email: 'paramedic.kumar@ems.gov',
        });
      } else {
        setError('Invalid operator credentials. Use the demo credentials provided below.');
        setLoading(false);
      }
    }, 400);
  };

  const handleQuickDemoFill = () => {
    setOperatorId('EMS-4102');
    setPin('108');
    setError(null);
    onLoginSuccess({
      id: 'OP-4102',
      name: 'Officer Rajesh Kumar',
      badgeNumber: 'EMS-4102',
      station: 'Central EMS Response Unit 01',
      role: 'ambulance_operator',
      email: 'paramedic.kumar@ems.gov',
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden border-b-4 border-red-600">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-red-500/20">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-red-950/70 text-red-300 text-[11px] font-bold px-3 py-1 rounded-full border border-red-800/80 mb-2">
            <Activity className="w-3.5 h-3.5 text-red-400" />
            <span>EMS Computer-Aided Dispatch (CAD)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Ambulance Operator Login
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Authorized portal for paramedic teams, ambulance fleet drivers, and emergency dispatchers.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Demo Credentials Quick Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Prototype Demo Credentials</span>
              </span>
              <span className="text-[10px] bg-blue-200/70 text-blue-900 font-mono px-2 py-0.5 rounded font-semibold">
                Auto-Fill Ready
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-white p-2 rounded-xl border border-blue-100 text-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Operator ID</span>
                <span className="font-bold">EMS-4102</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Access PIN</span>
                <span className="font-bold">108</span>
              </div>
            </div>
            <button
              type="button"
              id="btn-quick-ambulance-demo-login"
              onClick={handleQuickDemoFill}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2 px-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>1-Click Demo Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
                htmlFor="operatorId"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Operator Badge ID
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="operatorId"
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder="e.g. EMS-4102"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="pin"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Emergency Dispatch Access PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 3 or 4-digit PIN"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-ambulance-login"
              disabled={loading}
              className="w-full min-h-[48px] bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Ambulance Dashboard'}</span>
            </button>
          </form>

          {/* Security Notice & Public Portal Link */}
          <div className="pt-2 text-center space-y-3">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Protected Route • Restricted to Registered EMS Responders</span>
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
