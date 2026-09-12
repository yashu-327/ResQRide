import React from 'react';
import { Phone, AlertCircle, Shield } from 'lucide-react';

interface BystanderHeaderProps {
  onCallEmergency?: () => void;
}

export const BystanderHeader: React.FC<BystanderHeaderProps> = ({ onCallEmergency }) => {
  return (
    <header className="bg-slate-900 text-white border-b-2 border-red-600 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Public Emergency Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black text-xl tracking-wider shadow-sm ring-2 ring-red-500/30 shrink-0">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white">
                  ResQRide
                </span>
                <span className="inline-flex items-center gap-1 bg-red-950/80 text-red-300 text-[11px] px-2 py-0.5 rounded-full border border-red-800 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Emergency
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Public Vehicle QR Emergency Response Portal
              </p>
            </div>
          </div>

          {/* Quick Emergency Hotline Button */}
          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              onClick={(e) => {
                if (onCallEmergency) {
                  e.preventDefault();
                  onCallEmergency();
                }
              }}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Phone className="w-4 h-4 text-white animate-bounce" />
              <span>Dial 112</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
