import React from 'react';
import { AdminUser } from '../../types';
import { Building2, LogOut, ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface AdminHeaderProps {
  user: AdminUser;
  onSignOut: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="bg-slate-900 text-white border-b-2 border-slate-700 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Government Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">
                  Government Transport Authority
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-950/70 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-800">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  RTO Administration
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Route: <span className="text-slate-300 font-semibold">/admin</span> • Central Emergency QR Registry
              </p>
            </div>
          </div>

          {/* Admin Officer Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{user.name}</span>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">
                {user.rtoZone}
              </span>
            </div>

            <button
              onClick={onSignOut}
              id="btn-admin-sign-out"
              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out of Government Portal"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
