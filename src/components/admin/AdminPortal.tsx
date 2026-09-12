import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { VehicleRecord, EmergencyIncident } from '../../types';
import { getEmergencyUrl } from '../../utils/emergencyUrl';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RegisterVehicleForm } from './RegisterVehicleForm';
import {
  Building2,
  Search,
  QrCode,
  CheckCircle2,
  Printer,
  Heart,
  Car,
  Smartphone,
  Truck,
  Shield,
  Layers,
  PlusCircle,
  FileSpreadsheet,
  Download,
  X,
  AlertTriangle,
} from 'lucide-react';

interface AdminPortalProps {
  vehicles: VehicleRecord[];
  incidents: EmergencyIncident[];
  onSelectVehicleForDemo: (vehicle: VehicleRecord) => void;
  onVehicleRegistered: (newVehicle: VehicleRecord) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  vehicles,
  incidents,
  onSelectVehicleForDemo,
  onVehicleRegistered,
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'registry'>('register');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleForSticker, setSelectedVehicleForSticker] = useState<VehicleRecord>(
    vehicles[0]
  );
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [modalQrUrl, setModalQrUrl] = useState<string>('');

  // Generate QR for sticker modal containing the emergency URL route
  useEffect(() => {
    if (selectedVehicleForSticker) {
      const stickerEmergencyUrl = getEmergencyUrl(selectedVehicleForSticker.qrCodeId);
      QRCode.toDataURL(stickerEmergencyUrl, {
        width: 280,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })
        .then((url) => setModalQrUrl(url))
        .catch((err) => console.error('Error generating QR', err));
    }
  }, [selectedVehicleForSticker]);

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.qrCodeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Government/Admin Prototype Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase">
                Government/Admin Prototype
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                Prototype Demonstration • No Official Affiliation
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Vehicle Registration & Emergency QR System
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Prototype showing how motor licensing authorities can issue secure emergency QR codes during vehicle registration.
            </p>
          </div>
        </div>

        {/* Action Toggle Navigation */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700">
          <button
            id="tab-register-vehicle"
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Vehicle</span>
          </button>

          <button
            id="tab-vehicle-registry"
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Registry ({vehicles.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: REGISTER VEHICLE FORM */}
      {activeTab === 'register' && (
        <RegisterVehicleForm
          onVehicleRegistered={(newVehicle) => {
            onVehicleRegistered(newVehicle);
          }}
          onViewBystanderPortal={(newVehicle) => {
            onSelectVehicleForDemo(newVehicle);
          }}
          onBackToRegistry={() => setActiveTab('registry')}
        />
      )}

      {/* VIEW 2: VEHICLE REGISTRY TABLE & ARCHITECTURE OVERVIEW */}
      {activeTab === 'registry' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Architecture Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>RTO Registration</span>
                <Car className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                Secure QR Issuance
              </div>
              <p className="text-xs text-slate-600">
                Issued upon vehicle registration to link emergency contacts and blood group securely.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Bystander Portal</span>
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                Zero-App Web Access
              </div>
              <p className="text-xs text-slate-600">
                Standard smartphone cameras scan the decal to display immediate first-aid actions.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Privacy by Design</span>
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                Zero PII in QR Code
              </div>
              <p className="text-xs text-slate-600">
                Physical QR code contains only an encrypted reference ID without raw phone numbers or identities.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Total Registered</span>
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                {vehicles.length} Vehicles in State
              </div>
              <p className="text-xs text-slate-600">
                Select any vehicle record to preview or test-scan in the bystander portal.
              </p>
            </div>
          </div>

          {/* Vehicle Registry Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Vehicle Registry Database</h2>
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {filteredVehicles.length} Records
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click "Test Scan" on any vehicle to view how bystanders and paramedics interact with it.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by plate, owner, or QR ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <button
                  onClick={() => setActiveTab('register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register Vehicle</span>
                </button>
              </div>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Vehicle & Plate</th>
                    <th className="py-3.5 px-4">Owner Details</th>
                    <th className="py-3.5 px-4">Blood Group</th>
                    <th className="py-3.5 px-4">Emergency Contact(s)</th>
                    <th className="py-3.5 px-4">Emergency QR ID</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredVehicles.map((veh) => (
                    <tr key={veh.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-slate-900">{veh.plateNumber}</div>
                          {veh.isDemo ? (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                              Demo
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                              Live
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{veh.vehicleModel}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{veh.ownerName}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {veh.ownerPhone || 'Registered Owner'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg text-xs">
                          <Heart className="w-3 h-3 fill-red-600" />
                          {veh.bloodGroup}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-900">
                          {veh.primaryContact?.name
                            ? `${veh.primaryContact.name} (${veh.primaryContact.relation})`
                            : veh.primaryContact?.relation || 'Emergency Contact'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {veh.emergencyContacts && veh.emergencyContacts.length > 1 ? (
                            <span className="text-emerald-700 font-medium">
                              +{veh.emergencyContacts.length - 1} more contact(s)
                            </span>
                          ) : (
                            <span>1 contact linked</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200 font-medium">
                          {veh.qrCodeId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => onSelectVehicleForDemo(veh)}
                          className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Test Scan</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedVehicleForSticker(veh);
                            setShowStickerModal(true);
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer underline"
                        >
                          Decal Preview
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Proposed Vehicle Emergency Decal Modal (Prototype Visual) */}
      {showStickerModal && selectedVehicleForSticker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Emergency Vehicle Decal Preview
                  </h3>
                  <p className="text-[11px] text-slate-500">Government/Admin Prototype</p>
                </div>
              </div>
              <button
                onClick={() => setShowStickerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticker Graphic */}
            <div className="bg-white border-4 border-slate-900 rounded-2xl p-5 text-center shadow-inner space-y-3">
              <div className="bg-red-600 text-white font-extrabold text-xs py-1.5 px-2.5 rounded-lg tracking-wide uppercase shadow-xs flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
                <span>IN CASE OF ACCIDENT SCAN CODE</span>
              </div>

              {/* QR Image */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 inline-block shadow-sm">
                {modalQrUrl ? (
                  <img
                    src={modalQrUrl}
                    alt={`Emergency QR for ${selectedVehicleForSticker.plateNumber}`}
                    className="w-40 h-40 mx-auto"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}
              </div>

              <div>
                <div className="text-lg font-black text-slate-900 tracking-wider font-mono">
                  {selectedVehicleForSticker.plateNumber}
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {selectedVehicleForSticker.vehicleModel} • Blood: {selectedVehicleForSticker.bloodGroup}
                </div>
                <div className="text-xs font-mono text-blue-700 font-bold mt-1">
                  /emergency/{selectedVehicleForSticker.qrCodeId}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  ID: {selectedVehicleForSticker.qrCodeId}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                QR encodes emergency route URL. Zero raw personal data stored in QR code.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowStickerModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Smartphone className="w-3.5 h-3.5" />}
                onClick={() => {
                  setShowStickerModal(false);
                  onSelectVehicleForDemo(selectedVehicleForSticker);
                }}
              >
                Test Bystander Scan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
