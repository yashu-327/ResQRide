import React, { useState, useEffect, useRef } from 'react';
import { VehicleRecord, HospitalInfo, EmergencyContact, EmergencyRequest } from '../../types';
import { getEmergencyUrl } from '../../utils/emergencyUrl';
import { Badge } from '../ui/Badge';
import { EmergencyContactsModal } from './EmergencyContactsModal';
import { MaskedCallModal } from './MaskedCallModal';
import { NotifyFamilyModal } from './NotifyFamilyModal';
import { getRelationEmoji } from '../../services/telecomProxyService';
import { fetchRealNearbyHospitals, RealHospital } from '../../services/googlePlacesService';
import {
  Phone,
  MapPin,
  Ambulance,
  Building2,
  AlertTriangle,
  Heart,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Shield,
  Copy,
  Check,
  RotateCw,
  Navigation,
  ArrowRight,
  ExternalLink,
  Map,
  Send,
} from 'lucide-react';

interface BystanderPortalProps {
  vehicle: VehicleRecord;
  hospitals: HospitalInfo[];
  onRequestAmbulance: (payload: {
    emergencyId: string;
    vehiclePlate: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    locationAddress?: string;
    timestamp: string;
    bloodGroup?: string;
    medicalInfo?: string;
  }) => void;
  ambulanceRequested: boolean;
  latestRequest?: EmergencyRequest | null;
  onResetRequest?: () => void;
  onViewStatus?: () => void;
}

export const BystanderPortal: React.FC<BystanderPortalProps> = ({
  vehicle,
  onRequestAmbulance,
  ambulanceRequested,
  latestRequest,
  onResetRequest,
  onViewStatus,
}) => {
  // Geolocation State: 'detecting' | 'detected' | 'error'
  const [locationStatus, setLocationStatus] = useState<'detecting' | 'detected' | 'error'>('detecting');
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState<boolean>(false);

  const [showHospitals, setShowHospitals] = useState(false);
  const [realHospitals, setRealHospitals] = useState<RealHospital[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState<boolean>(false);
  const [hospitalsStatus, setHospitalsStatus] = useState<'idle' | 'loading' | 'success' | 'unavailable'>('idle');

  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [activeCallContact, setActiveCallContact] = useState<{ relation: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleInitiateCall = (contact: { relation: string }) => {
    setActiveCallContact(contact);
  };

  const emergencyUrl = getEmergencyUrl(vehicle.qrCodeId);
  const retryCountRef = useRef(0);

  // Fetch real nearby hospitals via Google Places service when bystander opens section
  useEffect(() => {
    if (!showHospitals) return;

    if (!coords || locationStatus !== 'detected') {
      setRealHospitals([]);
      setHospitalsStatus('idle');
      return;
    }

    let isMounted = true;
    setHospitalsLoading(true);
    setHospitalsStatus('loading');

    fetchRealNearbyHospitals(coords.lat, coords.lng)
      .then((res) => {
        if (!isMounted) return;
        setHospitalsLoading(false);
        if (res.status === 'success' && res.hospitals.length > 0) {
          setRealHospitals(res.hospitals);
          setHospitalsStatus('success');
        } else {
          setRealHospitals([]);
          setHospitalsStatus('unavailable');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setHospitalsLoading(false);
        setRealHospitals([]);
        setHospitalsStatus('unavailable');
      });

    return () => {
      isMounted = false;
    };
  }, [showHospitals, coords, locationStatus]);

  // Directly request browser location using navigator.geolocation.getCurrentPosition
  // Optimized for mobile Android GPS (30s timeout, enableHighAccuracy: true, maximumAge: 0, auto-retry once)
  const requestLocation = (isAutomaticRetry = false) => {
    if (!isAutomaticRetry) {
      retryCountRef.current = 0;
    }

    setLocationStatus('detecting');
    setLocationError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Please make sure Location is turned on and browser location permission is allowed.');
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000, // 30 seconds suitable for real mobile GPS satellite acquisition
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        // Use ONLY the actual latitude, longitude, and accuracy returned by the browser
        setCoords({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? 0,
        });
        setLocationStatus('detected');
        setLocationError(null);
        setShowLocationDialog(false);
      },
      (err) => {
        console.warn('Geolocation attempt failed:', err);

        // If the first high-accuracy request fails or times out, retry once automatically
        if (retryCountRef.current < 1) {
          retryCountRef.current += 1;
          console.log('Retrying geolocation once with high accuracy...');
          requestLocation(true);
          return;
        }

        // Both initial and automatic retry failed
        setLocationStatus('error');
        setLocationError('Please make sure Location is turned on and browser location permission is allowed.');
      },
      geoOptions
    );
  };

  useEffect(() => {
    requestLocation();
  }, [vehicle.qrCodeId]);

  const handleCopyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(emergencyUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleCall = (contactLabel: string) => {
    if (typeof window !== 'undefined') {
      if (contactLabel.includes('112')) {
        window.location.href = 'tel:112';
      } else {
        window.location.href = 'tel:108';
      }
    }
  };

  // Main Action: REQUEST AMBULANCE
  const handlePressRequestAmbulance = () => {
    // Before allowing "Request Ambulance", verify that a current location has been successfully obtained
    if (locationStatus !== 'detected' || !coords) {
      setShowLocationDialog(true);
      return;
    }

    // If accuracy is extremely poor (>1000m), warn the user and ask them to retry rather than silently accepting
    if (coords.accuracy > 1000) {
      setShowLocationDialog(true);
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const accuracyRounded = Math.round(coords.accuracy);

    // Use ONLY the latest successfully obtained latitude and longitude
    onRequestAmbulance({
      emergencyId: vehicle.qrCodeId,
      vehiclePlate: vehicle.plateNumber,
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy: coords.accuracy,
      locationAddress: `GPS: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}° (Accuracy: ~${accuracyRounded}m)`,
      timestamp: `${formattedTime}, Today`,
      bloodGroup: vehicle.bloodGroup !== 'Not Specified' ? vehicle.bloodGroup : undefined,
      medicalInfo:
        vehicle.allergies && vehicle.allergies.length > 0 && vehicle.allergies[0] !== 'None'
          ? `Allergy: ${vehicle.allergies.join(', ')}`
          : undefined,
    });
  };

  const allContacts: EmergencyContact[] =
    vehicle.emergencyContacts && vehicle.emergencyContacts.length > 0
      ? vehicle.emergencyContacts
      : [
          ...(vehicle.primaryContact ? [vehicle.primaryContact] : []),
          ...(vehicle.secondaryContact ? [vehicle.secondaryContact] : []),
        ];

  // Privacy-sanitized emergency contacts for bystander (relationship only, zero raw phone numbers or personal names)
  const safeContactsForBystander: EmergencyContact[] = allContacts.map((c) => ({
    name: '',
    relation: c.relation,
    phone: '',
  }));

  const hasBloodGroup =
    vehicle.bloodGroup &&
    vehicle.bloodGroup !== 'Not Specified' &&
    vehicle.bloodGroup !== 'Unknown';

  // -------------------------------------------------------------
  // CONFIRMATION SCREEN (When Ambulance Request Sent)
  // -------------------------------------------------------------
  if (ambulanceRequested) {
    const displayCoords = coords
      ? `${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`
      : 'Location Recorded';
    const accuracyText = coords ? `Accuracy: approximately ${Math.round(coords.accuracy)} meters` : null;
    const mapUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;
    const displayTime = latestRequest?.timestamp || 'Just now';

    const currentStatus = latestRequest?.status || 'Waiting for Response';
    const isAccepted = currentStatus === 'Accepted';
    const isEnRoute = currentStatus === 'En Route';
    const isArrived = currentStatus === 'Arrived';
    const isWaiting = currentStatus === 'Waiting for Response';

    return (
      <div className="w-full max-w-xl mx-auto space-y-4 pb-10 animate-in fade-in duration-300">
        {/* Simple Confirmation Card */}
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Ambulance className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Ambulance Request Sent
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your GPS coordinates and emergency details have been transmitted.
            </p>
          </div>

          {/* Live Dynamic Status Banner */}
          {isAccepted && (
            <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 rounded-2xl p-4 text-left flex items-start gap-3 shadow-xs animate-in fade-in">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Accepted
                </div>
                <div className="text-lg font-black text-emerald-950">
                  Ambulance request accepted
                </div>
                {latestRequest?.acceptedTime && (
                  <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                    Accepted at: {latestRequest.acceptedTime}
                  </div>
                )}
                <p className="text-xs text-emerald-800 mt-1">
                  Ambulance operator has accepted this emergency request.
                </p>
              </div>
            </div>
          )}

          {isEnRoute && (
            <div className="bg-blue-50 border-2 border-blue-500 text-blue-950 rounded-2xl p-4 text-left flex items-start gap-3 shadow-xs animate-in fade-in">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                  En Route
                </div>
                <div className="text-lg font-black text-blue-950">
                  Ambulance is on the way
                </div>
                <p className="text-xs text-blue-800 mt-1">
                  Ambulance is currently traveling to your GPS location.
                </p>
              </div>
            </div>
          )}

          {isArrived && (
            <div className="bg-teal-50 border-2 border-teal-500 text-teal-950 rounded-2xl p-4 text-left flex items-start gap-3 shadow-xs animate-in fade-in">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700">
                  Arrived
                </div>
                <div className="text-lg font-black text-teal-950">
                  Ambulance has arrived
                </div>
                <p className="text-xs text-teal-800 mt-1">
                  Responders have arrived at the scene.
                </p>
              </div>
            </div>
          )}

          {isWaiting && (
            <div className="bg-amber-50 border-2 border-amber-400 text-amber-950 rounded-2xl p-4 text-left flex items-start gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                  Waiting for Response
                </div>
                <div className="text-lg font-black text-amber-950">
                  Waiting for ambulance response
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Transmitted to emergency ambulance dashboard. Waiting for an operator to accept.
                </p>
              </div>
            </div>
          )}

          {/* 4-Step Emergency Status Flow Stepper */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-left">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <span>Status Flow</span>
              <span className="font-mono text-blue-700 font-bold">
                Emergency ID: {latestRequest?.emergencyId || vehicle.qrCodeId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: 'Waiting for Response', active: isWaiting, passed: isAccepted || isEnRoute || isArrived },
                { label: 'Accepted', active: isAccepted, passed: isEnRoute || isArrived },
                { label: 'En Route', active: isEnRoute, passed: isArrived },
                { label: 'Arrived', active: isArrived, passed: false },
              ].map((step, idx) => (
                <div
                  key={step.label}
                  className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all ${
                    step.active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : step.passed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] opacity-75">Step {idx + 1}</div>
                  <div className="truncate text-[11px] font-bold">{step.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Requested Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500 uppercase font-semibold">
                  Vehicle Number
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {vehicle.plateNumber}
                </div>
                <div className="text-xs text-slate-600">{vehicle.vehicleModel}</div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 uppercase font-semibold">
                  Emergency ID
                </div>
                <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                  {vehicle.qrCodeId}
                </div>
                <div className="text-xs text-slate-500">QR Route Active</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Current GPS Location:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{displayCoords}</span>
                </span>
                {accuracyText && (
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    {accuracyText}
                  </span>
                )}
                {mapUrl && (
                  <a
                    id="btn-bystander-open-location-maps"
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 mt-2 underline cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Location in Maps</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                )}
              </div>

              <div>
                <span className="text-slate-500 block font-medium">Request Time:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{displayTime}</span>
                </span>
                {latestRequest?.acceptedTime && (
                  <span className="text-[11px] text-emerald-800 font-bold block mt-1">
                    Accepted: {latestRequest.acceptedTime}
                  </span>
                )}
                {latestRequest?.locationDescription && (
                  <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                    {latestRequest.locationDescription}
                  </span>
                )}
              </div>
            </div>

            {hasBloodGroup && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Rider Blood Group: <strong className="text-red-700 font-bold">{vehicle.bloodGroup}</strong>
                </span>
                <span className="text-[11px] text-slate-500">
                  Profile Blood Info
                </span>
              </div>
            )}

            {latestRequest?.medicalInfo && (
              <div className="pt-1 text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <strong>Medical Info:</strong> {latestRequest.medicalInfo}
              </div>
            )}
          </div>

          {/* Primary Fallback Action: CALL EMERGENCY SERVICES */}
          <div className="pt-1 space-y-3">
            <button
              id="action-call-emergency-services-fallback"
              onClick={() => handleCall('National Emergency 112')}
              className="w-full min-h-[58px] bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-base sm:text-lg py-3.5 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Phone className="w-6 h-6 text-red-400" />
              <span>CALL EMERGENCY SERVICES (112)</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Immediate fallback: Dial national emergency response directly if the rider's condition is deteriorating.
            </p>
          </div>

          {/* Family Contact and Notification Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              id="btn-confirm-contact-family"
              onClick={() => setShowContactsModal(true)}
              className="min-h-[50px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Contact Family</span>
            </button>
            <button
              id="btn-confirm-notify-family"
              onClick={() => setShowNotifyModal(true)}
              className="min-h-[50px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Notify Family</span>
            </button>
          </div>

          {/* Prototype Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Prototype Demonstration:</strong> In this proposed prototype, no actual ambulance service has been dispatched. The request has been recorded in the demonstration application state.
            </div>
          </div>

          {/* Return or Reset Action */}
          {onResetRequest && (
            <div className="flex items-center justify-center pt-2 text-xs">
              <button
                onClick={onResetRequest}
                className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Return to Emergency Page
              </button>
            </div>
          )}
        </div>

        {/* Modals for Contacts, Masked Calling, and Family Notifications */}
        <EmergencyContactsModal
          isOpen={showContactsModal}
          onClose={() => setShowContactsModal(false)}
          contacts={safeContactsForBystander}
          onInitiateCall={handleInitiateCall}
        />

        <MaskedCallModal
          isOpen={activeCallContact !== null}
          onClose={() => setActiveCallContact(null)}
          contact={activeCallContact}
        />

        <NotifyFamilyModal
          isOpen={showNotifyModal}
          onClose={() => setShowNotifyModal(false)}
          contacts={safeContactsForBystander}
          vehiclePlate={vehicle.plateNumber}
          locationAddress={
            coords
              ? `GPS: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}° (Accuracy: ~${Math.round(coords.accuracy)}m)`
              : undefined
          }
          coordinates={coords}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // REGULAR EMERGENCY PAGE
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-xl mx-auto space-y-3.5 pb-10">
      {/* 1. Emergency Status Bar */}
      <div className="bg-red-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
          <div>
            <div className="text-xs uppercase font-extrabold tracking-wider text-red-100">
              Emergency Status
            </div>
            <div className="text-sm font-black tracking-wide">
              Active Incident • Bystander Emergency Portal
            </div>
          </div>
        </div>
        <span className="text-[11px] bg-red-800/80 text-white font-mono px-2.5 py-1 rounded-lg border border-red-400/40">
          PROTOTYPE
        </span>
      </div>

      {/* Active Ambulance Status Tracker Banner (if request exists for this emergency) */}
      {latestRequest && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                <Ambulance className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Emergency ID: {latestRequest.emergencyId || vehicle.qrCodeId}
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Ambulance Status:</span>
                  <span className="text-amber-400 font-extrabold">{latestRequest.status}</span>
                </div>
              </div>
            </div>

            {onViewStatus && (
              <button
                id="btn-view-live-tracking-banner"
                onClick={onViewStatus}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>Live Tracking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-300 font-medium pl-10">
            {latestRequest.status === 'Waiting for Response' && (
              <span>&ldquo;Waiting for ambulance response&rdquo;</span>
            )}
            {latestRequest.status === 'Accepted' && (
              <span className="text-emerald-300">&ldquo;Ambulance request accepted&rdquo;</span>
            )}
            {latestRequest.status === 'En Route' && (
              <span className="text-blue-300">&ldquo;Ambulance is on the way&rdquo;</span>
            )}
            {latestRequest.status === 'Arrived' && (
              <span className="text-teal-300">&ldquo;Ambulance has arrived&rdquo;</span>
            )}
          </div>
        </div>
      )}

      {/* Location Status Display Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <div className="flex items-start justify-between gap-2.5 flex-wrap">
          {locationStatus === 'detecting' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs sm:text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>Finding your location...</span>
              </div>
              <div className="text-xs text-slate-500">
                GPS may take a few seconds.
              </div>
            </div>
          )}

          {locationStatus === 'detected' && coords && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Location detected</span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Accuracy: approximately {Math.round(coords.accuracy)} meters
              </div>
            </div>
          )}

          {locationStatus === 'error' && (
            <div className="space-y-1.5 flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 text-red-700 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>We couldn't get your location.</span>
              </div>
              <p className="text-xs text-slate-600">
                Please make sure Location is turned on and browser location permission is allowed.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={() => requestLocation()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={() => handleCall('National Emergency 112')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <span>Call Emergency Services</span>
                </button>
              </div>
            </div>
          )}

          {/* Location Actions: Open Map and Try Again (when detected) */}
          {locationStatus === 'detected' && coords && (
            <div className="flex items-center gap-2 ml-auto">
              <a
                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
                title="Open detected location in Google Maps"
              >
                <Map className="w-3.5 h-3.5 text-blue-600" />
                <span>Open Map</span>
                <ExternalLink className="w-3 h-3 ml-0.5 text-blue-500" />
              </a>

              <button
                onClick={() => requestLocation()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Refresh GPS location"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Low Accuracy Warning (> 1000m) */}
        {locationStatus === 'detected' && coords && coords.accuracy > 1000 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>Location accuracy is low. Please enable precise location and try again.</span>
            </div>
            <button
              onClick={() => requestLocation()}
              className="self-start sm:self-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <RotateCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Display detected raw coordinates subtly */}
        {locationStatus === 'detected' && coords && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>
              {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
            </span>
            <span className="text-slate-400">
              Live Browser Geolocation API
            </span>
          </div>
        )}
      </div>

      {/* Location Missing / Accuracy Warning Modal Prompt */}
      {showLocationDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                coords && coords.accuracy > 1000
                  ? 'bg-amber-100 text-amber-700'
                  : locationStatus === 'detecting'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {locationStatus === 'detecting' ? (
                <MapPin className="w-8 h-8 animate-bounce" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">
                {coords && coords.accuracy > 1000
                  ? 'Location Accuracy Too Low'
                  : locationStatus === 'detecting'
                  ? 'Finding your location...'
                  : "We couldn't get your location."}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {coords && coords.accuracy > 1000
                  ? `Accuracy is approximately ${Math.round(coords.accuracy)} meters (greater than 1000m). The ambulance request must not be sent with an inaccurate location. Please enable precise location and try again.`
                  : locationStatus === 'detecting'
                  ? 'GPS may take a few seconds. The ambulance request cannot be sent without your location.'
                  : 'Please make sure Location is turned on and browser location permission is allowed.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  requestLocation();
                  setShowLocationDialog(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => {
                  setShowLocationDialog(false);
                  handleCall('National Emergency 112');
                }}
                className="w-full bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-red-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Emergency Services</span>
              </button>
            </div>

            <button
              onClick={() => setShowLocationDialog(false)}
              className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer pt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 2. Vehicle & Essential Rider Details — Minimum Necessary Information Only */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Vehicle Details</span>
            </div>

            {/* Vehicle Registration Number */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {vehicle.plateNumber}
            </h2>

            {/* Vehicle Type & Model */}
            <div className="text-sm font-medium text-slate-600">
              <span className="font-semibold text-slate-800">{vehicle.vehicleModel}</span>
              {vehicle.vehicleType && (
                <>
                  <span className="mx-1.5 text-slate-300">•</span>
                  <span className="text-slate-500 capitalize">{vehicle.vehicleType}</span>
                </>
              )}
            </div>

            {/* Emergency QR Reference */}
            <div className="text-xs text-slate-500 font-mono pt-0.5">
              ID: <span className="font-semibold text-slate-700">{vehicle.qrCodeId}</span>
            </div>
          </div>

          {/* Optional Blood Group (If provided by owner) */}
          {hasBloodGroup && (
            <div className="bg-red-600 text-white rounded-2xl px-4 py-2.5 text-center shadow-sm shrink-0">
              <div className="text-[10px] font-bold tracking-widest uppercase text-red-100 flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 fill-white" />
                <span>Blood</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black leading-none mt-0.5">
                {vehicle.bloodGroup}
              </div>
            </div>
          )}
        </div>

        {/* Optional Allergies / Medical Note (if provided) */}
        {vehicle.allergies &&
          vehicle.allergies.length > 0 &&
          vehicle.allergies[0] !== 'None' && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 bg-amber-50/80 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-950 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Medical Note:</strong> Allergy: {vehicle.allergies.join(', ')}
              </span>
            </div>
          )}
      </div>

      {/* 3. MAIN ACTION: REQUEST AMBULANCE */}
      <div className="space-y-3">
        <button
          id="action-request-ambulance"
          onClick={handlePressRequestAmbulance}
          className="w-full min-h-[66px] bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xl sm:text-2xl py-4 px-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Ambulance className="w-8 h-8 shrink-0" />
          <span>REQUEST AMBULANCE</span>
        </button>

        {/* Action Button 2: CONTACT FAMILY */}
        <button
          id="action-contact-family"
          onClick={() => setShowContactsModal(true)}
          className="w-full min-h-[60px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-lg sm:text-xl py-3.5 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Users className="w-6 h-6" />
          <span>CONTACT FAMILY</span>
        </button>

        {/* Action Button 3: NOTIFY FAMILY */}
        <button
          id="action-notify-family"
          onClick={() => setShowNotifyModal(true)}
          className="w-full min-h-[60px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-lg sm:text-xl py-3.5 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Send className="w-6 h-6" />
          <span>NOTIFY FAMILY</span>
        </button>

        {/* Action Button 4: Find Nearby Hospitals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <button
            id="action-find-hospitals"
            onClick={() => setShowHospitals(!showHospitals)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Find Nearby Hospitals</h3>
                <p className="text-xs text-slate-500">
                  {coords && locationStatus === 'detected'
                    ? realHospitals.length > 0
                      ? `${realHospitals.length} nearby hospitals found`
                      : 'Find nearby hospitals using GPS'
                    : 'Requires GPS location'}
                </p>
              </div>
            </div>
            {showHospitals ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {showHospitals && (
            <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-3 animate-in fade-in">
              {/* If real location is not available, clearly ask the user to enable location */}
              {!coords || locationStatus !== 'detected' ? (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-11 h-11 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {locationStatus === 'detecting'
                        ? 'Detecting your precise location...'
                        : 'Location is unavailable'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                      {locationStatus === 'detecting'
                        ? 'Please wait while GPS location is being detected to find nearby hospitals.'
                        : 'Please enable location on your device to find nearby hospitals.'}
                    </p>
                  </div>
                  <button
                    id="btn-enable-location-hospitals"
                    onClick={() => requestLocation()}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{locationStatus === 'detecting' ? 'Detecting Location...' : 'Enable Location'}</span>
                  </button>
                </div>
              ) : hospitalsLoading ? (
                <div className="py-6 text-center space-y-2">
                  <RotateCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Searching nearby hospitals via Google Maps...
                  </p>
                </div>
              ) : hospitalsStatus === 'unavailable' || realHospitals.length === 0 ? (
                /* Fallback when real hospital service is unavailable or API configuration is missing */
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-3">
                  <p className="text-slate-700 text-sm font-medium">
                    Unable to load nearby hospitals.
                  </p>
                  <div>
                    <a
                      id="btn-search-google-maps-hospitals"
                      href={`https://www.google.com/maps/search/hospitals/@${coords.lat},${coords.lng},14z`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm py-3 px-5 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Search Hospitals in Google Maps</span>
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Searches hospitals around your current GPS coordinates
                  </p>
                </div>
              ) : (
                /* Only display hospitals returned by the real location service */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                    <span>Hospitals near your GPS location:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Real Google Places Service
                    </span>
                  </div>

                  {realHospitals.map((hosp) => (
                    <div
                      key={hosp.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-sm sm:text-base">
                            {hosp.name}
                          </div>
                          <div className="text-xs font-semibold text-slate-600">
                            {hosp.distance} from your location
                          </div>
                        </div>

                        <div className="shrink-0 pt-1 sm:pt-0">
                          <a
                            id={`btn-open-maps-${hosp.id}`}
                            href={hosp.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open in Google Maps</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button: Share Location */}
        <button
          id="action-share-location"
          onClick={() => requestLocation()}
          className="w-full min-h-[58px] font-bold text-base sm:text-lg py-3.5 px-5 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950"
        >
          <MapPin className="w-6 h-6" />
          <span>
            {locationStatus === 'detected'
              ? 'Refresh / Share Location'
              : 'Share Location'}
          </span>
        </button>

        {/* Action Button: Call Emergency Services */}
        <button
          id="action-call-emergency-services"
          onClick={() => handleCall('National Emergency 112')}
          className="w-full min-h-[58px] bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-base sm:text-lg py-3.5 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <Phone className="w-6 h-6 text-red-400" />
          <span>Call Emergency Services (112)</span>
        </button>
      </div>

      {/* Quick First-Aid Advice */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1">
        <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Quick First-Aid Guidance</span>
        </div>
        <p>
          • <strong>Do not remove helmet</strong> unless the rider is choking or unable to breathe.
        </p>
        <p>
          • <strong>Do not move neck or spine</strong> unless immediate fire or traffic hazard exists.
        </p>
        <p>• Keep the rider warm, talk calmly, and wait for emergency responders.</p>
      </div>

      {/* Modals for Emergency Contacts, Masked Calling, and Family Notifications */}
      <EmergencyContactsModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={safeContactsForBystander}
        onInitiateCall={handleInitiateCall}
      />

      <MaskedCallModal
        isOpen={activeCallContact !== null}
        onClose={() => setActiveCallContact(null)}
        contact={activeCallContact}
      />

      <NotifyFamilyModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        contacts={safeContactsForBystander}
        vehiclePlate={vehicle.plateNumber}
        locationAddress={
          coords
            ? `GPS: ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}° (Accuracy: ~${Math.round(coords.accuracy)}m)`
            : undefined
        }
        coordinates={coords}
      />
    </div>
  );
};
