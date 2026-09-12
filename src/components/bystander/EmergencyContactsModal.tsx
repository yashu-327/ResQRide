import React from 'react';
import { EmergencyContact } from '../../types';
import { Phone, ShieldCheck, X, Users, User } from 'lucide-react';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: EmergencyContact[];
  onInitiateCall: (contact: { relation: string; name?: string }) => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onInitiateCall,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-emergency-contacts"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                Emergency Contacts
              </h3>
              <p className="text-xs text-slate-500">Registered family contacts for this vehicle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Callout */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Privacy Protected Proxy Calling</span>
            <p className="text-emerald-900 text-[11px] leading-relaxed">
              Your phone number and the contact's phone number remain completely hidden. Calls are bridged through ResQRide proxy.
            </p>
          </div>
        </div>

        {/* Contacts List */}
        <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto pr-0.5">
          {contacts.map((contact, idx) => {
            return (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs text-slate-700">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      <span>{contact.relation}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Registered Emergency Contact
                    </div>
                    {/* IMPORTANT: Phone numbers and full personal details are strictly private */}
                  </div>
                </div>

                <button
                  id={`btn-call-${contact.relation.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`}
                  onClick={() => {
                    onClose();
                    onInitiateCall({
                      relation: contact.relation,
                    });
                  }}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {contact.relation}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
