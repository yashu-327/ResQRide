import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { VehicleRecord, EmergencyContact } from '../../types';
import { getEmergencyUrl } from '../../utils/emergencyUrl';
import { Button } from '../ui/Button';
import {
  Shield,
  Car,
  User,
  Users,
  Heart,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Printer,
  ArrowRight,
  AlertCircle,
  QrCode,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface RegisterVehicleFormProps {
  onVehicleRegistered: (newVehicle: VehicleRecord) => void;
  onViewBystanderPortal?: (vehicle: VehicleRecord) => void;
  onBackToRegistry?: () => void;
}

const RELATION_OPTIONS = [
  'Mother',
  'Father',
  'Wife',
  'Husband',
  'Brother',
  'Sister',
  'Other',
] as const;

const VEHICLE_TYPES = [
  'Two-Wheeler (Motorcycle)',
  'Two-Wheeler (Scooter)',
  'Four-Wheeler (Car/Sedan)',
  'Four-Wheeler (SUV)',
  'Electric Two-Wheeler',
  'Electric Four-Wheeler',
  'Commercial Vehicle',
  'Other',
];

const BLOOD_GROUPS = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'Not Specified',
];

export const RegisterVehicleForm: React.FC<RegisterVehicleFormProps> = ({
  onVehicleRegistered,
  onViewBystanderPortal,
  onBackToRegistry,
}) => {
  // Vehicle Details
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Two-Wheeler (Motorcycle)');
  const [vehicleModel, setVehicleModel] = useState('');

  // Owner Details
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Emergency Contacts (at least one, user can add multiple)
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: '', relation: 'Father', phone: '' },
  ]);

  // Optional Medical Info
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Form State & Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success State
  const [registeredVehicle, setRegisteredVehicle] = useState<VehicleRecord | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Generate QR code data URL containing the emergency URL route (/emergency/{id})
  useEffect(() => {
    if (registeredVehicle) {
      const emergencyUrl = getEmergencyUrl(registeredVehicle.qrCodeId);
      // Encode the emergency URL that opens the emergency page for that specific vehicle
      QRCode.toDataURL(emergencyUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [registeredVehicle]);

  // Add another emergency contact row
  const handleAddContact = () => {
    setContacts((prev) => [...prev, { name: '', relation: 'Mother', phone: '' }]);
  };

  // Remove an emergency contact row
  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  // Update contact field
  const handleUpdateContact = (
    index: number,
    field: keyof EmergencyContact,
    value: string
  ) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!plateNumber.trim()) {
      newErrors.plateNumber = 'Vehicle registration number is required';
    } else if (plateNumber.trim().length < 4) {
      newErrors.plateNumber = 'Please enter a valid registration number (e.g. DL 01 AB 1234)';
    }

    if (!vehicleType.trim()) {
      newErrors.vehicleType = 'Vehicle type is required';
    }

    if (!vehicleModel.trim()) {
      newErrors.vehicleModel = 'Vehicle model is required (e.g. Honda Activa 6G, Yamaha FZ)';
    }

    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }

    if (!ownerPhone.trim()) {
      newErrors.ownerPhone = 'Owner phone number is required';
    } else if (ownerPhone.replace(/\D/g, '').length < 8) {
      newErrors.ownerPhone = 'Please enter a valid phone number (at least 8-10 digits)';
    }

    // Validate emergency contacts
    contacts.forEach((contact, idx) => {
      if (!contact.name.trim()) {
        newErrors[`contact_name_${idx}`] = `Contact #${idx + 1} name is required`;
      }
      if (!contact.phone.trim()) {
        newErrors[`contact_phone_${idx}`] = `Contact #${idx + 1} phone is required`;
      } else if (contact.phone.replace(/\D/g, '').length < 8) {
        newErrors[`contact_phone_${idx}`] = `Valid phone required for Contact #${idx + 1}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // 1. Generate unique Emergency QR ID (e.g. RQR-DEMO-DL-582910)
    const cleanedPlate = plateNumber.trim().toUpperCase();
    const statePrefix = cleanedPlate.replace(/[^A-Z]/g, '').substring(0, 2) || 'IN';
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const generatedQrId = `RQR-${statePrefix}-${randomDigits}`;

    // 2. Prepare vehicle record
    const allergiesList = allergies.trim()
      ? allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['None'];

    const notesList = medicalNotes.trim()
      ? [medicalNotes.trim()]
      : [];

    const newVehicle: VehicleRecord = {
      id: `veh-${Date.now()}`,
      plateNumber: cleanedPlate,
      vehicleType,
      vehicleModel: vehicleModel.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      bloodGroup: bloodGroup === 'Not Specified' ? 'Unknown' : bloodGroup,
      allergies: allergiesList,
      medicalNotes: notesList,
      primaryContact: contacts[0],
      secondaryContact: contacts[1] || undefined,
      emergencyContacts: contacts,
      qrCodeId: generatedQrId,
      rtoOffice: `Proposed RTO Registry (${statePrefix})`,
      registeredDate: 'Live Record',
      isDemo: false,
      verificationStatus: 'verified',
    };

    // 3. Save vehicle information to data store/state
    onVehicleRegistered(newVehicle);
    setRegisteredVehicle(newVehicle);
    setIsSubmitting(false);
  };

  // Download QR decal image
  const handleDownloadQR = () => {
    if (!registeredVehicle || !qrCodeDataUrl) return;

    // Create a printable canvas with vehicle info & QR decal
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 700;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 700);

    // Decal Border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 560, 660);

    // Header Banner
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(25, 25, 550, 80);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY VEHICLE QR', 300, 62);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SCAN IN CASE OF ACCIDENT FOR FIRST-AID & DISPATCH', 300, 88);

    // Vehicle Plate
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(registeredVehicle.plateNumber, 300, 150);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(
      `${registeredVehicle.vehicleModel} • Blood: ${registeredVehicle.bloodGroup}`,
      300,
      180
    );

    // Load QR Image onto canvas
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 150, 210, 300, 300);

      // Decal Footer
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(25, 525, 550, 150);

      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`/emergency/${registeredVehicle.qrCodeId}`, 300, 560);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`ID: ${registeredVehicle.qrCodeId}`, 300, 588);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px sans-serif';
      ctx.fillText('Scan with any standard smartphone camera. Opens Emergency Portal.', 300, 616);
      ctx.fillText('ResQRide • Government/Admin Prototype Decal', 300, 642);

      // Trigger download
      const downloadLink = document.createElement('a');
      downloadLink.download = `ResQRide-Emergency-Decal-${registeredVehicle.plateNumber.replace(/\s+/g, '-')}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    };
    img.src = qrCodeDataUrl;
  };

  // Reset form to register another vehicle
  const handleRegisterAnother = () => {
    setRegisteredVehicle(null);
    setQrCodeDataUrl('');
    setPlateNumber('');
    setVehicleModel('');
    setOwnerName('');
    setOwnerPhone('');
    setContacts([{ name: '', relation: 'Father', phone: '' }]);
    setBloodGroup('O+');
    setAllergies('');
    setMedicalNotes('');
    setErrors({});
  };

  // -------------------------------------------------------------
  // SUCCESS SCREEN
  // -------------------------------------------------------------
  if (registeredVehicle && qrCodeDataUrl) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Success Card */}
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Vehicle Registered Successfully
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              The emergency QR code has been generated and linked to this vehicle's emergency record.
            </p>
          </div>

          {/* Registration Details Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Vehicle Number</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {registeredVehicle.plateNumber}
              </div>
              <div className="text-xs text-slate-600">{registeredVehicle.vehicleModel}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Emergency QR ID</div>
              <div className="text-lg font-bold text-blue-700 font-mono">
                {registeredVehicle.qrCodeId}
              </div>
              <div className="text-xs text-slate-500">Secure identifier (Zero personal info in QR)</div>
            </div>

            {/* Emergency Page Route Box */}
            <div className="border-t border-slate-200 sm:col-span-2 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Emergency Page URL (Encoded in QR)
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready for Scanning
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900">
                <span className="truncate text-blue-700 font-semibold">
                  {getEmergencyUrl(registeredVehicle.qrCodeId)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(getEmergencyUrl(registeredVehicle.qrCodeId));
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="shrink-0 flex items-center gap-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg font-sans transition-colors cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-300" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 sm:col-span-2 pt-3 flex items-center justify-between text-xs text-slate-600">
              <span>
                Owner: <strong>{registeredVehicle.ownerName}</strong>
              </span>
              <span>
                Emergency Contacts: <strong>{registeredVehicle.emergencyContacts?.length || 1} Linked</strong>
              </span>
              <span>
                Blood: <strong>{registeredVehicle.bloodGroup}</strong>
              </span>
            </div>
          </div>

          {/* Visually Suitable Printable Vehicle Decal */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
              <Printer className="w-4 h-4" />
              <span>Printable Vehicle Decal Preview</span>
            </div>

            <div
              id="printable-vehicle-decal"
              className="bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-md max-w-sm mx-auto space-y-3.5 text-center relative overflow-hidden"
            >
              {/* Caution Top Strip */}
              <div className="bg-red-600 text-white font-extrabold text-xs sm:text-sm py-1.5 px-3 rounded-lg uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                <span>IN CASE OF EMERGENCY SCAN CODE</span>
              </div>

              {/* QR Code Container */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 inline-block shadow-inner">
                <img
                  src={qrCodeDataUrl}
                  alt={`Emergency QR for ${registeredVehicle.plateNumber}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-lg"
                />
              </div>

              {/* Plate & Route on decal */}
              <div className="space-y-0.5">
                <div className="text-xl font-black text-slate-900 font-mono tracking-wider">
                  {registeredVehicle.plateNumber}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {registeredVehicle.vehicleModel} • Blood: {registeredVehicle.bloodGroup}
                </div>
                <div className="text-xs font-mono text-blue-700 font-semibold truncate pt-1">
                  /emergency/{registeredVehicle.qrCodeId}
                </div>
              </div>

              {/* Decal Footer Warning */}
              <div className="bg-slate-100 rounded-xl py-1.5 px-2 text-[10px] text-slate-600 font-medium border border-slate-200">
                Weatherproof Adhesive • Attach to Visor / Fuel Tank / Windshield
              </div>
            </div>
          </div>

          {/* Action Buttons as requested: "Download QR" and "Register Another Vehicle" */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              id="btn-download-qr"
              variant="primary"
              size="lg"
              icon={<Download className="w-5 h-5" />}
              onClick={handleDownloadQR}
              className="w-full sm:w-auto"
            >
              Download QR
            </Button>

            <Button
              id="btn-register-another"
              variant="secondary"
              size="lg"
              icon={<Plus className="w-5 h-5" />}
              onClick={handleRegisterAnother}
              className="w-full sm:w-auto"
            >
              Register Another Vehicle
            </Button>
          </div>

          {/* Quick Option to Test Scan in Bystander Portal */}
          {onViewBystanderPortal && (
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
              <button
                onClick={() => onViewBystanderPortal(registeredVehicle)}
                className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5 cursor-pointer underline"
              >
                <span>Test scan this vehicle in Bystander Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {onBackToRegistry && (
                <button
                  onClick={onBackToRegistry}
                  className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Return to Vehicle Registry
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // REGISTRATION FORM
  // -------------------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Prototype Context Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm text-blue-950">
            Government / Admin Prototype: Vehicle Emergency Registration
          </div>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            This module simulates how a motor licensing authority or RTO could issue a secure emergency QR decal upon vehicle registration. The QR contains only a unique reference ID (no raw personal or contact data is stored in the physical QR code).
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Register Vehicle & Generate Emergency QR
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fill in the vehicle, owner, and emergency contact details to generate the official emergency sticker.
          </p>
        </div>

        {/* SECTION 1: VEHICLE DETAILS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            <Car className="w-4 h-4 text-blue-600" />
            <span>1. Vehicle Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Registration Number */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                id="input-plate-number"
                type="text"
                placeholder="e.g. DL 01 AB 4092"
                value={plateNumber}
                onChange={(e) => {
                  setPlateNumber(e.target.value.toUpperCase());
                  if (errors.plateNumber) {
                    setErrors((prev) => ({ ...prev, plateNumber: '' }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.plateNumber
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {errors.plateNumber && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.plateNumber}</span>
                </p>
              )}
            </div>

            {/* Vehicle Type */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Type <span className="text-red-500">*</span>
              </label>
              <select
                id="input-vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Model */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Model <span className="text-red-500">*</span>
              </label>
              <input
                id="input-vehicle-model"
                type="text"
                placeholder="e.g. Honda Activa 6G"
                value={vehicleModel}
                onChange={(e) => {
                  setVehicleModel(e.target.value);
                  if (errors.vehicleModel) {
                    setErrors((prev) => ({ ...prev, vehicleModel: '' }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.vehicleModel
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {errors.vehicleModel && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.vehicleModel}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: OWNER DETAILS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>2. Owner Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                id="input-owner-name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  if (errors.ownerName) {
                    setErrors((prev) => ({ ...prev, ownerName: '' }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.ownerName
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {errors.ownerName && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.ownerName}</span>
                </p>
              )}
            </div>

            {/* Owner Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Owner Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="input-owner-phone"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={ownerPhone}
                onChange={(e) => {
                  setOwnerPhone(e.target.value);
                  if (errors.ownerPhone) {
                    setErrors((prev) => ({ ...prev, ownerPhone: '' }));
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  errors.ownerPhone
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {errors.ownerPhone && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.ownerPhone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: EMERGENCY CONTACTS (MULTIPLE ALLOWED) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>3. Emergency Contacts</span>
              <span className="text-xs font-normal text-slate-500">
                (Add family members to notify in case of an incident)
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddContact}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Contact</span>
            </button>
          </div>

          <div className="space-y-3">
            {contacts.map((contact, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Emergency Contact #{idx + 1}{' '}
                    {idx === 0 && <span className="text-emerald-700 font-semibold">(Primary)</span>}
                  </span>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(idx)}
                      className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Contact Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={contact.name}
                      onChange={(e) => handleUpdateContact(idx, 'name', e.target.value)}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors[`contact_name_${idx}`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors[`contact_name_${idx}`] && (
                      <p className="text-[11px] text-red-600 mt-1">
                        {errors[`contact_name_${idx}`]}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={contact.relation}
                      onChange={(e) => handleUpdateContact(idx, 'relation', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      {RELATION_OPTIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contact Phone Number */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={contact.phone}
                      onChange={(e) => handleUpdateContact(idx, 'phone', e.target.value)}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors[`contact_phone_${idx}`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors[`contact_phone_${idx}`] && (
                      <p className="text-[11px] text-red-600 mt-1">
                        {errors[`contact_phone_${idx}`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: OPTIONAL MEDICAL INFORMATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            <Heart className="w-4 h-4 text-red-600" />
            <span>4. Optional Medical Information</span>
            <span className="text-xs font-normal text-slate-500">
              (Critical for paramedics during the golden hour)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Blood Group */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group (Optional)
              </label>
              <select
                id="input-blood-group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            {/* Allergies */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Known Allergies (Optional)
              </label>
              <input
                id="input-allergies"
                type="text"
                placeholder="e.g. Penicillin, Sulfa, Latex (comma separated)"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Important Medical Info */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Important Medical Information (Optional)
              </label>
              <textarea
                id="input-medical-notes"
                rows={2}
                placeholder="e.g. Asthmatic (carries inhaler), Diabetic Type-1, Cardiac stent, etc."
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Privacy & QR Safety Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
          <QrCode className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <p>
            <strong>Privacy Guarantee:</strong> The generated QR code will strictly encode the secure Emergency QR ID. Phone numbers, full addresses, and personal identities are NOT embedded in the physical QR pattern.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {onBackToRegistry && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onBackToRegistry}
            >
              Cancel
            </Button>
          )}

          <Button
            id="btn-submit-registration"
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {isSubmitting ? 'Generating Decal...' : 'Register Vehicle & Generate QR'}
          </Button>
        </div>
      </form>
    </div>
  );
};
