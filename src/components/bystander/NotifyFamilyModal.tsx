import React, { useState } from 'react';
import { EmergencyContact } from '../../types';
import { Check, Send, AlertTriangle, ShieldCheck, X, CheckCircle2, MapPin, User } from 'lucide-react';

interface NotifyFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: EmergencyContact[];
  vehiclePlate: string;
  locationAddress?: string;
  coordinates?: {
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
}

export const NotifyFamilyModal: React.FC<NotifyFamilyModalProps> = ({
  isOpen,
  onClose,
  contacts,
  vehiclePlate,
  locationAddress,
  coordinates,
}) => {
  // Pre-select all available relations by default
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    contacts.map((_, i) => i)
  );
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const toggleContact = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIndices.length === contacts.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(contacts.map((_, i) => i));
    }
  };

  const handleSendNotification = () => {
    if (selectedIndices.length === 0) return;

    setIsSending(true);
    // Simulate server dispatch delay
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
    }, 700);
  };

  const handleResetAndClose = () => {
    setIsSent(false);
    setIsSending(false);
    setSelectedIndices(contacts.map((_, i) => i));
    onClose();
  };

  // Location string for preview
  const displayLocation =
    coordinates
      ? `Latitude: ${coordinates.lat.toFixed(5)}, Longitude: ${coordinates.lng.toFixed(5)}${
          coordinates.accuracy ? ` (Accuracy: ~${Math.round(coordinates.accuracy)}m)` : ''
        }`
      : locationAddress || 'GPS Location detected at incident scene';

  const previewMessage = `Emergency alert: An incident involving the registered vehicle has been reported. Please contact emergency services.`;

  return (
    <div
      id="modal-notify-family"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Notify Family</h3>
              <p className="text-xs text-slate-500">Dispatch emergency alerts to registered contacts</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSent ? (
          <div className="space-y-4">
            {/* Contact Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Emergency Recipients
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {selectedIndices.length === contacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {contacts.map((contact, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleContact(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {contact.relation}
                          </div>
                          <div className="text-[11px] text-slate-500">Emergency Contact</div>
                          {/* Privacy: Never expose phone numbers in UI */}
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 text-white' : 'border-2 border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification Message Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Message Preview
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-2">
                <div className="font-medium text-slate-900 leading-relaxed">
                  "{previewMessage}"
                </div>
                <div className="pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-0.5">
                  <div className="flex items-start gap-1 font-mono text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>Location: {displayLocation}</span>
                  </div>
                  <div>
                    Vehicle Plate: <strong className="font-mono">{vehiclePlate}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Badge */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100/80 rounded-xl p-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Your phone number and the contacts' phone numbers are protected and never shown.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-1">
              <button
                id="action-submit-notify-family"
                onClick={handleSendNotification}
                disabled={selectedIndices.length === 0 || isSending}
                className={`w-full min-h-[54px] font-bold text-base py-3.5 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedIndices.length === 0 || isSending
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                }`}
              >
                <Send className="w-5 h-5" />
                <span>
                  {isSending
                    ? 'Dispatching Emergency Alert...'
                    : `Send Emergency Alert (${selectedIndices.length})`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* SUCCESS STATE */
          <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-emerald-800">Emergency alert sent</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Dispatched to {selectedIndices.length} registered emergency contact
                {selectedIndices.length > 1 ? 's' : ''}.
              </p>
            </div>

            {/* Dispatched message copy */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left text-xs text-slate-700 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Delivered Alert Content:
              </div>
              <p className="text-slate-900 font-medium leading-relaxed">
                "{previewMessage}"
              </p>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex items-start gap-1 font-mono">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>Location: {displayLocation}</span>
              </div>
            </div>

            {/* Prototype Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-950 flex items-start gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Prototype Demonstration:</strong> No actual SMS was sent. In production, this broadcasts via high-priority SMS and WhatsApp emergency dispatch gateways.
              </div>
            </div>

            <button
              id="action-close-notify-success"
              onClick={handleResetAndClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 px-4 rounded-xl cursor-pointer shadow-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
