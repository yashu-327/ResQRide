import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, ShieldCheck, AlertTriangle, User, CheckCircle2 } from 'lucide-react';

interface MaskedCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    relation: string;
    name?: string;
  } | null;
}

export const MaskedCallModal: React.FC<MaskedCallModalProps> = ({
  isOpen,
  onClose,
  contact,
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);

  // Reset and handle prototype calling progression
  useEffect(() => {
    if (!isOpen || !contact) {
      setCallStatus('connecting');
      setCallDuration(0);
      return;
    }

    setCallStatus('connecting');
    setCallDuration(0);

    // Simulate proxy connection establishing after 1.8 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 1800);

    return () => {
      clearTimeout(connectTimer);
    };
  }, [isOpen, contact]);

  // Duration timer when connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  if (!isOpen || !contact) return null;

  const minutes = Math.floor(callDuration / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (callDuration % 60).toString().padStart(2, '0');

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div
      id="modal-masked-call"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-5 text-center animate-in zoom-in-95 duration-200">
        {/* Contact Avatar / Icon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {callStatus === 'connecting' && (
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-75" />
          )}
          <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner text-slate-300">
            <User className="w-9 h-9" />
          </div>
        </div>

        {/* Status Messaging */}
        <div className="space-y-1.5">
          <div className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1.5">
            <span>{contact.relation}</span>
          </div>

          {callStatus === 'connecting' && (
            <div className="text-amber-400 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 animate-pulse">
              <Phone className="w-4 h-4" />
              <span>Connecting to {contact.relation}...</span>
            </div>
          )}

          {callStatus === 'connected' && (
            <div className="space-y-1">
              <div className="text-emerald-400 font-bold text-base sm:text-lg flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Emergency call connected</span>
              </div>
              <div className="text-xs font-mono text-emerald-300">
                Call Duration: {minutes}:{seconds}
              </div>
            </div>
          )}

          {callStatus === 'ended' && (
            <div className="text-slate-400 font-medium text-sm">
              Call ended
            </div>
          )}
        </div>

        {/* Privacy Callout */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5 text-left">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Proxy Privacy Guarantee</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-medium">
            Your phone number and the contact's phone number are hidden.
          </p>
          <p className="text-[11px] text-slate-400">
            ResQRide bridges the call through an anonymous secure telecom gateway.
          </p>
        </div>

        {/* Prototype Warning Badge */}
        <div className="bg-amber-950/50 border border-amber-800/40 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2 text-left">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Prototype / Simulated Call:</strong> Telecom carrier proxy simulation. In production, this connects via a cloud IVR gateway.
          </div>
        </div>

        {/* End Call Button */}
        <div className="pt-2">
          <button
            id="action-end-masked-call"
            onClick={handleEndCall}
            className="w-full min-h-[54px] bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-base py-3 px-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
