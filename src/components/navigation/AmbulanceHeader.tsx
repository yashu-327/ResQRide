import React from 'react';
import { OperatorUser } from '../../types';
import { Truck, LogOut, ShieldCheck, Activity } from 'lucide-react';

interface AmbulanceHeaderProps {
  user: OperatorUser;
  onSignOut: () => void;
}

export const AmbulanceHeader: React.FC<AmbulanceHeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="bg-slate-900 text-white border-b-2 border-red-600 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & EMS Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-sm ring-2 ring-red-500/30 shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">
                  EMS Dispatch System
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-950/70 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Feed Connected
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Route: <span className="text-slate-300 font-semibold">/ambulance</span> • {user.station}
              </p>
            </div>
          </div>

          {/* Operator Profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{user.name}</span>
              <span className="text-[10px] text-red-400 font-mono font-semibold">
                Badge #{user.badgeNumber}
              </span>
            </div>

            <button
              onClick={onSignOut}
              id="btn-ambulance-sign-out"
              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out of Ambulance Dispatch"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
