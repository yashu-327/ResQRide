import React, { useState } from 'react';
import { PortalType, OperatorUser, AdminUser } from '../../types';
import {
  Smartphone,
  Truck,
  Building2,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Layers,
  Compass,
  ExternalLink,
} from 'lucide-react';

interface PrototypeRoleDockProps {
  currentRoute: PortalType;
  currentEmergencyId: string;
  ambulanceUser: OperatorUser | null;
  adminUser: AdminUser | null;
  onNavigateRoute: (route: PortalType, emergencyId?: string) => void;
}

export const PrototypeRoleDock: React.FC<PrototypeRoleDockProps> = ({
  currentRoute,
  currentEmergencyId,
  ambulanceUser,
  adminUser,
  onNavigateRoute,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      aria-label="Prototype Role Switcher"
      className="fixed bottom-3 right-3 z-50 select-none print:hidden"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 text-xs">
        {/* Collapsed Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          id="btn-toggle-prototype-dock"
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-tight text-slate-200">
              Prototype Role & Route Switcher
            </span>
            <span className="bg-slate-800 text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
              {currentRoute === 'bystander'
                ? `/emergency/${currentEmergencyId}`
                : `/${currentRoute}`}
            </span>
          </div>

          <div className="text-slate-400 hover:text-white flex items-center">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Expanded Role Navigation Menu */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2.5 max-w-sm">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ResQRide separates the 3 modules by role. Use these controls to test isolated routes in this prototype:
            </p>

            <div className="space-y-1.5">
              {/* Role 1: Public Bystander */}
              <button
                id="dock-goto-bystander"
                onClick={() => {
                  onNavigateRoute('bystander', currentEmergencyId);
                  setIsExpanded(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                  currentRoute === 'bystander'
                    ? 'bg-red-600/20 border-red-500/60 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      currentRoute === 'bystander'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Public Bystander</span>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                        Public (No Login)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      /emergency/{currentEmergencyId}
                    </div>
                  </div>
                </div>

                {currentRoute === 'bystander' && (
                  <span className="text-[10px] font-bold text-red-400 mr-1">Active</span>
                )}
              </button>

              {/* Role 2: Protected Ambulance */}
              <button
                id="dock-goto-ambulance"
                onClick={() => {
                  onNavigateRoute('ambulance');
                  setIsExpanded(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                  currentRoute === 'ambulance'
                    ? 'bg-red-600/20 border-red-500/60 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      currentRoute === 'ambulance'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Ambulance Dispatch</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5 ${
                          ambulanceUser
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {ambulanceUser ? (
                          <>
                            <Unlock className="w-2.5 h-2.5" /> Auth
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5" /> Protected
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">/ambulance</div>
                  </div>
                </div>

                {currentRoute === 'ambulance' && (
                  <span className="text-[10px] font-bold text-red-400 mr-1">Active</span>
                )}
              </button>

              {/* Role 3: Protected Admin */}
              <button
                id="dock-goto-admin"
                onClick={() => {
                  onNavigateRoute('admin');
                  setIsExpanded(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                  currentRoute === 'admin'
                    ? 'bg-amber-600/20 border-amber-500/60 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      currentRoute === 'admin'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Government / Admin</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5 ${
                          adminUser
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {adminUser ? (
                          <>
                            <Unlock className="w-2.5 h-2.5" /> Auth
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5" /> Protected
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">/admin</div>
                  </div>
                </div>

                {currentRoute === 'admin' && (
                  <span className="text-[10px] font-bold text-amber-400 mr-1">Active</span>
                )}
              </button>
            </div>

            <div className="pt-1 text-[10px] text-slate-500 text-center border-t border-slate-800/80">
              Prototype testing utility for evaluating role isolation.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
