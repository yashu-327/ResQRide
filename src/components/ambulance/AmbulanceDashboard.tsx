import React, { useState, useEffect, useCallback } from 'react';
import { EmergencyRequest, EmergencyIncident, HospitalInfo, EmergencyRequestStatus, getEmergencyStatusRank } from '../../types';
import { Badge } from '../ui/Badge';
import {
  Ambulance,
  MapPin,
  AlertTriangle,
  Clock,
  Navigation,
  CheckCircle2,
  ShieldAlert,
  Radio,
  ExternalLink,
  Map,
  ArrowRight,
  User,
  Activity,
  Phone,
  Droplet,
} from 'lucide-react';

// Configurable prototype arrival threshold in kilometers (default: 4.0 km)
export const ARRIVAL_DISTANCE_THRESHOLD_KM = 4.0;

/**
 * Calculates great-circle distance between two GPS coordinates using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface AmbulanceDashboardProps {
  emergencyRequests?: EmergencyRequest[];
  incidents?: EmergencyIncident[];
  hospitals: HospitalInfo[];
  arrivalThresholdKm?: number;
  onUpdateStatus?: (
    requestId: string,
    newStatus: EmergencyRequestStatus,
    acceptedTime?: string
  ) => void;
  onUpdateEmergencyRequestStatus?: (
    requestId: string,
    newStatus: EmergencyRequestStatus,
    acceptedTime?: string
  ) => void;
  onUpdateIncidentStatus?: (
    incidentId: string,
    newStatus: any,
    acceptedTime?: string
  ) => void;
}

export const AmbulanceDashboard: React.FC<AmbulanceDashboardProps> = ({
  emergencyRequests,
  incidents,
  hospitals,
  arrivalThresholdKm = ARRIVAL_DISTANCE_THRESHOLD_KM,
  onUpdateStatus,
  onUpdateEmergencyRequestStatus,
  onUpdateIncidentStatus,
}) => {
  // Use emergencyRequests if passed, otherwise fallback to incidents
  const requestList: EmergencyRequest[] = emergencyRequests || incidents || [];

  const isWaiting = (status?: string) =>
    status === 'Waiting for Response' || status === 'waiting_response' || status === 'pending';
  const isAccepted = (status?: string) =>
    status === 'Accepted' || status === 'accepted' || status === 'dispatched';
  const isEnRoute = (status?: string) =>
    status === 'En Route' || status === 'en_route';
  const isArrived = (status?: string) =>
    status === 'Arrived' || status === 'arrived';

  const getStatusRank = (status?: string): number => {
    if (!status) return 1;
    if (isArrived(status)) return 4;
    if (isEnRoute(status)) return 3;
    if (isAccepted(status)) return 2;
    return 1;
  };

  const [activeIncidentId, setActiveIncidentId] = useState<string>(
    requestList[0]?.id || ''
  );

  // Real GPS location of the ambulance / operator device
  const [ambulanceLocation, setAmbulanceLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [isLocatingAmbulance, setIsLocatingAmbulance] = useState<boolean>(true);
  const [ambulanceLocationError, setAmbulanceLocationError] = useState<string | null>(null);

  // Obtain current real GPS location of the ambulance device
  const fetchAmbulanceLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsLocatingAmbulance(false);
      setAmbulanceLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingAmbulance(true);
    setAmbulanceLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAmbulanceLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLocatingAmbulance(false);
        setAmbulanceLocationError(null);
      },
      (err) => {
        console.warn('[AmbulanceDashboard] Geolocation acquisition failed:', err.message);
        setIsLocatingAmbulance(false);
        setAmbulanceLocationError(
          err.code === 1
            ? 'Location permission was denied. Please allow device location access.'
            : err.message || 'Unable to access device location.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  // Continuous watch to keep ambulance location updated in real time while dashboard is open
  useEffect(() => {
    fetchAmbulanceLocation();

    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setAmbulanceLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setIsLocatingAmbulance(false);
          setAmbulanceLocationError(null);
        },
        (err) => {
          console.warn('[AmbulanceDashboard] Geolocation watch error:', err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [fetchAmbulanceLocation]);

  // Auto-select latest incident or any incident waiting for response
  useEffect(() => {
    if (requestList.length > 0) {
      const waiting = requestList.find((i) => isWaiting(i.status));
      if (waiting) {
        setActiveIncidentId(waiting.id);
      } else if (!requestList.some((i) => i.id === activeIncidentId)) {
        setActiveIncidentId(requestList[0].id);
      }
    }
  }, [requestList]);

  // Fallback to first incident if active is not found
  const activeIncident =
    requestList.find((i) => i.id === activeIncidentId) || requestList[0];

  // 1. Victim location from GPS coordinates captured when bystander requested ambulance
  const victimLat = activeIncident?.coordinates?.lat ?? activeIncident?.latitude;
  const victimLng = activeIncident?.coordinates?.lng ?? activeIncident?.longitude;

  const hasVictimLocation = typeof victimLat === 'number' && typeof victimLng === 'number';
  const hasAmbulanceLocation = ambulanceLocation !== null;

  // 2. Calculate approximate distance between victim location and current ambulance location
  const currentDistanceKm =
    hasVictimLocation && hasAmbulanceLocation
      ? calculateDistanceKm(
          victimLat,
          victimLng,
          ambulanceLocation.latitude,
          ambulanceLocation.longitude
        )
      : null;

  // 3. Arrival threshold rule (4 km prototype threshold)
  const isWithinArrivalThreshold =
    currentDistanceKm !== null && currentDistanceKm <= arrivalThresholdKm;

  // Allow "Mark Arrived" only when ambulance location is verified and distance <= 4 km
  const canMarkArrived = hasVictimLocation && hasAmbulanceLocation && isWithinArrivalThreshold;

  const handleUpdate = (requestId: string, newStatus: EmergencyRequestStatus, acceptedTime?: string) => {
    if (onUpdateEmergencyRequestStatus) {
      onUpdateEmergencyRequestStatus(requestId, newStatus, acceptedTime);
    } else if (onUpdateStatus) {
      onUpdateStatus(requestId, newStatus, acceptedTime);
    } else if (onUpdateIncidentStatus) {
      onUpdateIncidentStatus(requestId, newStatus, acceptedTime);
    }
  };

  const handleAcceptRequest = (requestId: string) => {
    const target = requestList.find((r) => r.id === requestId) || (activeIncident?.id === requestId ? activeIncident : undefined);
    if (!target) return;

    // Status flow is strictly one-way: only allows transition from 'Waiting for Response' to 'Accepted'
    if (isArrived(target.status) || !isWaiting(target.status)) {
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    handleUpdate(requestId, 'Accepted', formattedTime);
  };

  const handleSetStatus = (
    requestId: string,
    newStatus: EmergencyRequestStatus
  ) => {
    const target = requestList.find((r) => r.id === requestId) || (activeIncident?.id === requestId ? activeIncident : undefined);
    if (!target) return;

    // 1. Once Arrived, status is permanently locked - no modifications allowed
    if (isArrived(target.status)) {
      return;
    }

    // 2. Strictly one-way flow: Waiting for Response (0) -> Accepted (1) -> En Route (2) -> Arrived (3)
    const currentRank = getEmergencyStatusRank(target.status);
    const newRank = getEmergencyStatusRank(newStatus);
    if (newRank <= currentRank) {
      // Cannot move backward or repeat current status
      return;
    }

    // 3. Distance verification check: prevent marking Arrived if not within threshold or no location
    if (newStatus === 'Arrived' && !canMarkArrived) {
      return;
    }

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    handleUpdate(
      requestId,
      newStatus,
      newStatus === 'Accepted' ? formattedTime : undefined
    );
  };

  const getStatusBadge = (status: string) => {
    if (isWaiting(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-extrabold px-3 py-1 rounded-full text-xs shadow-xs animate-pulse">
          <span className="w-2 h-2 rounded-full bg-slate-950" />
          Waiting for Response
        </span>
      );
    }
    if (isAccepted(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Accepted
        </span>
      );
    }
    if (isEnRoute(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xs">
          <Navigation className="w-3.5 h-3.5 animate-pulse" />
          En Route
        </span>
      );
    }
    if (isArrived(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-teal-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Arrived
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-800 font-bold px-3 py-1 rounded-full text-xs">
        {status}
      </span>
    );
  };

  const getMapUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const waitingCount = requestList.filter((i) => isWaiting(i.status)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Emergency Dispatch Alert */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Ambulance className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-white">Ambulance Dashboard</h1>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Emergency Dispatch Prototype
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Receives live QR emergency requests with real bystander GPS coordinates, vehicle registration, and rider medical data
            </p>
          </div>
        </div>

        {/* Quick Unit Status & Prototype Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-2.5 rounded-2xl border border-slate-700">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Simulated Unit
              </div>
              <div className="text-sm font-bold text-white">Ambulance Unit #104</div>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Queue Status
              </div>
              <div className="text-sm font-bold">
                {waitingCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-red-400 font-extrabold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {waitingCount} Waiting
                  </span>
                ) : (
                  <span className="text-slate-300">All Responded</span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-2 rounded-xl text-xs text-slate-300">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>CAD Auto-Sync: Active</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Incident List + Selected Incident Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incident Selector Queue (Left Column) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Incoming Requests ({requestList.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Click to view request details
            </span>
          </div>

          <div className="space-y-2.5">
            {requestList.map((incident) => {
              const isSelected = activeIncident?.id === incident.id;
              const isWaitingItem = isWaiting(incident.status);

              return (
                <div
                  key={incident.id}
                  id={`queue-item-${incident.id}`}
                  onClick={() => setActiveIncidentId(incident.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                    isSelected
                      ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/40 shadow-sm'
                      : isWaitingItem
                      ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-50 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Highlight for NEW EMERGENCY */}
                  {isWaitingItem && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-bl-lg shadow-xs tracking-wider flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>NEW EMERGENCY</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base font-mono">
                          {incident.vehiclePlate}
                        </span>
                        <span className="text-xs text-slate-500">• {incident.timeReported || incident.timestamp}</span>
                      </div>
                      {incident.emergencyId && (
                        <div className="text-[11px] font-mono text-blue-700 font-semibold mt-0.5">
                          ID: {incident.emergencyId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 truncate font-mono">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="truncate">{incident.locationAddress || incident.locationDescription || 'GPS Location Transmitted'}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      {incident.bloodGroup && incident.bloodGroup !== 'Not Specified' && (
                        <span className="font-semibold text-red-700 bg-red-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                          <Droplet className="w-3 h-3" />
                          <span>{incident.bloodGroup}</span>
                        </span>
                      )}
                      {(incident.medicalAlert || incident.medicalInfo) && (
                        <span className="text-amber-800 font-medium truncate max-w-[130px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{incident.medicalAlert || incident.medicalInfo}</span>
                        </span>
                      )}
                    </div>

                    <div>{getStatusBadge(incident.status)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Incident Action Center (Right Column) */}
        <div className="lg:col-span-7 space-y-4">
          {activeIncident ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
              {/* Top Dynamic Status Banner */}
              {isWaiting(activeIncident.status) ? (
                <div className="bg-amber-500 text-slate-950 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-amber-600">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-sm">
                      <Ambulance className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold tracking-wider uppercase text-slate-900">
                        NEW EMERGENCY • STATUS: WAITING FOR RESPONSE
                      </div>
                      <div className="text-xl font-black tracking-tight text-slate-950">
                        Waiting for Response
                      </div>
                      <div className="text-xs text-slate-900 font-semibold mt-0.5">
                        &ldquo;Waiting for ambulance response&rdquo;
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button: Accept Request */}
                  <button
                    id="btn-accept-request"
                    onClick={() => handleAcceptRequest(activeIncident.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Accept Request</span>
                  </button>
                </div>
              ) : isAccepted(activeIncident.status) ? (
                <div className="bg-emerald-600 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white text-emerald-700 flex items-center justify-center font-black shrink-0 shadow-sm">
                      <Ambulance className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-100">
                        STATUS: ACCEPTED
                      </div>
                      <div className="text-xl font-black tracking-tight">
                        Ambulance Request Accepted
                      </div>
                      <div className="text-xs text-emerald-100 font-medium mt-0.5 flex items-center flex-wrap gap-x-2">
                        <span>&ldquo;Ambulance request accepted&rdquo;</span>
                        {activeIncident.acceptedTime && (
                          <span>• Accepted at: <strong>{activeIncident.acceptedTime}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button: Mark En Route */}
                  <button
                    id="btn-advance-en-route"
                    onClick={() => handleSetStatus(activeIncident.id, 'En Route')}
                    className="bg-white hover:bg-emerald-50 text-emerald-900 font-black text-sm py-3 px-5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Mark En Route</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : isEnRoute(activeIncident.status) ? (
                <div className="bg-blue-600 text-white rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-white text-blue-700 flex items-center justify-center font-black shrink-0 shadow-sm">
                        <Navigation className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold tracking-wider uppercase text-blue-100">
                          STATUS: EN ROUTE
                        </div>
                        <div className="text-xl font-black tracking-tight">
                          Ambulance En Route
                        </div>
                        <div className="text-xs text-blue-100 font-medium mt-0.5">
                          &ldquo;Ambulance is on the way&rdquo;
                          {activeIncident.acceptedTime && ` • Accepted at: ${activeIncident.acceptedTime}`}
                        </div>
                      </div>
                    </div>

                    {/* Primary Action Button: Mark Arrived */}
                    <button
                      id="btn-advance-arrived"
                      onClick={() => handleSetStatus(activeIncident.id, 'Arrived')}
                      disabled={!canMarkArrived}
                      className={`text-sm font-black py-3 px-5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${
                        canMarkArrived
                          ? 'bg-white hover:bg-blue-50 text-blue-900 cursor-pointer'
                          : 'bg-blue-300/40 text-blue-100 border border-blue-400/30 cursor-not-allowed opacity-80'
                      }`}
                      title={
                        !hasAmbulanceLocation
                          ? '⚠️ Unable to verify ambulance location.'
                          : !isWithinArrivalThreshold
                          ? `⚠️ Ambulance is still far from the victim's location. Current distance: ${currentDistanceKm !== null ? `${currentDistanceKm.toFixed(1)} km` : ''}`
                          : '✓ Ambulance is within the arrival area.'
                      }
                    >
                      <CheckCircle2 className={`w-4 h-4 ${canMarkArrived ? 'text-emerald-600' : 'text-blue-200'}`} />
                      <span>Mark Arrived</span>
                    </button>
                  </div>

                  {/* Arrival Proximity Feedback in Top Banner */}
                  <div className="pt-3 border-t border-blue-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {!hasAmbulanceLocation ? (
                      <div className="flex items-center gap-2 text-blue-100 font-semibold">
                        <span>⚠️ Unable to verify ambulance location.</span>
                        <button
                          type="button"
                          onClick={fetchAmbulanceLocation}
                          className="underline hover:text-white cursor-pointer ml-1 text-xs"
                        >
                          Retry GPS
                        </button>
                      </div>
                    ) : !isWithinArrivalThreshold ? (
                      <div className="space-y-0.5 text-blue-100">
                        <div className="font-bold">⚠️ Ambulance is still far from the victim's location.</div>
                        <div className="text-blue-200 text-[11px]">
                          Please reach the victim's location before marking as arrived.
                        </div>
                      </div>
                    ) : (
                      <div className="font-bold text-emerald-200">
                        ✓ Ambulance is within the arrival area.
                      </div>
                    )}

                    {currentDistanceKm !== null && (
                      <div className="font-semibold text-white bg-blue-700/80 px-2.5 py-1 rounded-lg border border-blue-400/40 text-xs self-start sm:self-auto">
                        Current distance: {currentDistanceKm < 0.1 ? '< 0.1 km' : `${currentDistanceKm.toFixed(1)} km`}
                      </div>
                    )}
                  </div>
                </div>
              ) : isArrived(activeIncident.status) ? (
                <div className="bg-teal-700 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white text-teal-700 flex items-center justify-center font-black shrink-0 shadow-sm">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold tracking-wider uppercase text-teal-100">
                        STATUS: ARRIVED
                      </div>
                      <div className="text-xl font-black tracking-tight">
                        Ambulance Has Arrived
                      </div>
                      <div className="text-xs text-teal-100 font-medium mt-0.5">
                        &ldquo;Ambulance has arrived&rdquo;
                        {activeIncident.acceptedTime && ` • Accepted at: ${activeIncident.acceptedTime}`}
                      </div>
                    </div>
                  </div>

                  <span className="bg-teal-800/80 text-teal-100 border border-teal-500/40 text-xs px-3 py-1.5 rounded-xl font-bold">
                    At Scene
                  </span>
                </div>
              ) : null}

              {/* Clear Status Buttons / Actions Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Ambulance Operator Actions
                    </div>
                    <div className="text-xs text-slate-500">
                      Emergency ID:{' '}
                      <span className="font-mono font-bold text-blue-700">
                        {activeIncident.emergencyId || activeIncident.vehiclePlate}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    Status flow: Waiting for Response → Accepted → En Route → Arrived
                  </div>
                </div>

                {/* Real-time Ambulance Location & Arrival Verification Card */}
                <div
                  id="ambulance-live-location-card"
                  className={`rounded-2xl border p-4 text-xs transition-colors ${
                    !hasAmbulanceLocation
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                      : !isWithinArrivalThreshold
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-current/15">
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasAmbulanceLocation ? (
                        <>
                          <span className="font-extrabold text-sm text-emerald-900 flex items-center gap-1.5">
                            📍 Ambulance location detected
                          </span>
                          {ambulanceLocation?.accuracy !== undefined && (
                            <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md text-[11px] border border-emerald-300/60">
                              (Accuracy: ~{Math.round(ambulanceLocation.accuracy)}m)
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                          <span>⚠️ Unable to verify ambulance location.</span>
                          {isLocatingAmbulance && (
                            <span className="text-[11px] font-normal text-amber-800 animate-pulse">
                              (Requesting GPS...)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {!hasAmbulanceLocation && (
                      <button
                        type="button"
                        onClick={fetchAmbulanceLocation}
                        className="bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold px-3 py-1 rounded-lg border border-amber-400 text-xs cursor-pointer self-start sm:self-auto shrink-0 transition-colors"
                      >
                        {isLocatingAmbulance ? 'Detecting...' : 'Retry GPS'}
                      </button>
                    )}
                  </div>

                  {/* Real-time Telemetry: Victim location, Ambulance location, Approximate distance */}
                  <div className="my-3 bg-white rounded-xl p-3.5 border border-slate-200 font-mono text-xs space-y-1.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Victim location:</span>
                      <span className="font-bold text-slate-900">
                        {hasVictimLocation
                          ? `Victim: ${victimLat.toFixed(5)}, ${victimLng.toFixed(5)}`
                          : 'Victim: Coordinates unavailable'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500 font-medium">Ambulance location:</span>
                      <span className="font-bold text-blue-700">
                        {hasAmbulanceLocation
                          ? `Ambulance: ${ambulanceLocation.latitude.toFixed(5)}, ${ambulanceLocation.longitude.toFixed(5)}`
                          : 'Ambulance: Location not detected'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Approximate distance:</span>
                      <span
                        className={`font-black text-sm ${
                          currentDistanceKm === null
                            ? 'text-slate-400'
                            : isWithinArrivalThreshold
                            ? 'text-emerald-700'
                            : 'text-amber-800'
                        }`}
                      >
                        {currentDistanceKm !== null
                          ? `Distance: ${currentDistanceKm < 0.1 ? '< 0.1 km' : `${currentDistanceKm.toFixed(1)} km`}`
                          : 'Distance: Unavailable'}
                      </span>
                    </div>
                  </div>

                  {/* Rule Evaluation Status */}
                  {!hasAmbulanceLocation ? (
                    <div className="text-amber-900 text-xs">
                      {ambulanceLocationError ||
                        'Device location permission is required from the ambulance device to calculate distance to victim.'}
                    </div>
                  ) : !isWithinArrivalThreshold ? (
                    <div className="space-y-1 text-amber-950">
                      <div className="font-bold text-xs text-amber-900">
                        ⚠️ Ambulance is still far from the victim's location.
                      </div>
                      <div className="text-amber-800 text-xs font-medium">
                        Please reach the victim's location before marking as arrived.
                      </div>
                      <div className="flex flex-wrap items-center justify-between pt-1 border-t border-amber-200 text-xs">
                        <span className="font-bold text-amber-950">
                          Current distance: {currentDistanceKm !== null ? `${currentDistanceKm.toFixed(1)} km` : ''}
                        </span>
                        <span className="text-amber-700 text-[11px]">
                          Arrival threshold: ≤ {arrivalThresholdKm} km
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-emerald-950">
                      <div className="font-bold text-xs text-emerald-900">
                        ✓ Ambulance is within the arrival area.
                      </div>
                      <div className="flex flex-wrap items-center justify-between pt-1 border-t border-emerald-200 text-xs">
                        <span className="font-bold text-emerald-900">
                          Current distance: {currentDistanceKm !== null ? (currentDistanceKm < 0.1 ? '< 0.1 km' : `${currentDistanceKm.toFixed(1)} km`) : '0.0 km'}
                        </span>
                        <span className="text-emerald-700 text-[11px]">
                          Arrival threshold: ≤ {arrivalThresholdKm} km
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Completed Banner if Arrived */}
                {isArrived(activeIncident.status) && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold">
                      Ambulance has arrived at the scene. Emergency is complete; all status actions are now finalized and disabled.
                    </span>
                  </div>
                )}

                {/* 3 Explicit Status Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Action 1: Accept Request */}
                  <button
                    id="btn-status-action-accept"
                    disabled={!isWaiting(activeIncident.status) || isArrived(activeIncident.status)}
                    onClick={() => handleAcceptRequest(activeIncident.id)}
                    title={
                      isArrived(activeIncident.status)
                        ? 'Emergency has arrived. No further action available.'
                        : isWaiting(activeIncident.status)
                        ? 'Accept Request'
                        : 'Request already accepted'
                    }
                    className={`min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                      isArrived(activeIncident.status)
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : isWaiting(activeIncident.status)
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isArrived(activeIncident.status)
                          ? 'text-slate-400'
                          : isWaiting(activeIncident.status)
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>Accept Request</span>
                  </button>

                  {/* Action 2: Mark En Route */}
                  <button
                    id="btn-status-action-enroute"
                    disabled={!isAccepted(activeIncident.status) || isArrived(activeIncident.status)}
                    onClick={() => handleSetStatus(activeIncident.id, 'En Route')}
                    title={
                      isArrived(activeIncident.status)
                        ? 'Emergency has arrived. No further action available.'
                        : isAccepted(activeIncident.status)
                        ? 'Mark En Route'
                        : isWaiting(activeIncident.status)
                        ? 'Must accept request first'
                        : 'Ambulance is already en route or arrived'
                    }
                    className={`min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                      isArrived(activeIncident.status)
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : isAccepted(activeIncident.status)
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-xs cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Navigation
                      className={`w-4 h-4 ${
                        isArrived(activeIncident.status)
                          ? 'text-slate-400'
                          : isAccepted(activeIncident.status)
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>Mark En Route</span>
                  </button>

                  {/* Action 3: Mark Arrived */}
                  <button
                    id="btn-status-action-arrived"
                    disabled={isArrived(activeIncident.status) || !isEnRoute(activeIncident.status) || !canMarkArrived}
                    onClick={() => handleSetStatus(activeIncident.id, 'Arrived')}
                    title={
                      isArrived(activeIncident.status)
                        ? 'Emergency has arrived (Final status). No further action available.'
                        : !isEnRoute(activeIncident.status)
                        ? 'Ambulance must be En Route before marking arrived'
                        : !hasAmbulanceLocation
                        ? '⚠️ Unable to verify ambulance location.'
                        : !isWithinArrivalThreshold
                        ? `⚠️ Ambulance is still far from the victim's location. Current distance: ${currentDistanceKm !== null ? `${currentDistanceKm.toFixed(1)} km` : ''}`
                        : '✓ Ambulance is within the arrival area.'
                    }
                    className={`min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                      isArrived(activeIncident.status)
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : isEnRoute(activeIncident.status) && canMarkArrived
                        ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-xs cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isArrived(activeIncident.status)
                          ? 'text-slate-400'
                          : isEnRoute(activeIncident.status) && canMarkArrived
                          ? 'text-white'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>Mark Arrived</span>
                  </button>
                </div>

                {/* Status Stepper and Reset Control */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Active Status:</span>
                    {getStatusBadge(activeIncident.status)}
                  </div>

                  <div className="flex items-center gap-3">
                    {isArrived(activeIncident.status) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-xs flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 select-none">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Final Status: Arrived (Permanent)
                        </span>
                        <button
                          id="btn-status-action-reset"
                          disabled={true}
                          className="hidden"
                          aria-hidden="true"
                          tabIndex={-1}
                          title="Reset disabled for Arrived emergency"
                        >
                          Reset to Waiting for Response
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Status Flow Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'Waiting for Response', label: '1. Waiting for Response', check: isWaiting },
                  { key: 'Accepted', label: '2. Accepted', check: isAccepted },
                  { key: 'En Route', label: '3. En Route', check: isEnRoute },
                  { key: 'Arrived', label: '4. Arrived', check: isArrived },
                ].map((step) => {
                  const isCurrent = step.check(activeIncident.status);

                  return (
                    <div
                      key={step.key}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isCurrent
                          ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 font-medium'
                      }`}
                    >
                      <div className="text-xs">{step.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Vehicle & Emergency ID Identification */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 font-mono">
                      Vehicle: {activeIncident.vehiclePlate}
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Request Time: {activeIncident.timeReported || activeIncident.timestamp}
                    </span>
                    {activeIncident.acceptedTime && (
                      <span className="text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Accepted: {activeIncident.acceptedTime}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {activeIncident.vehiclePlate}
                  </h2>
                  <div className="text-sm text-slate-600 font-medium flex items-center gap-2 mt-0.5">
                    <span>{activeIncident.riderName || 'Vehicle Rider'}</span>
                    <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs font-bold">
                      Emergency ID: {activeIncident.emergencyId || 'QR-NOT-SET'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Current Status
                  </div>
                  <div className="mt-1">{getStatusBadge(activeIncident.status)}</div>
                </div>
              </div>

              {/* Crucial Medical Banner for Paramedics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                  <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                    Blood Group
                  </div>
                  <div className="text-2xl font-black text-red-700 mt-0.5">
                    {activeIncident.bloodGroup && activeIncident.bloodGroup !== 'Not Specified'
                      ? activeIncident.bloodGroup
                      : 'Not Provided'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {activeIncident.bloodGroup && activeIncident.bloodGroup !== 'Not Specified'
                      ? 'From Vehicle QR Profile'
                      : 'No blood group provided'}
                  </div>
                </div>

                <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Important Medical Information</span>
                  </div>
                  <div className="text-sm font-bold text-amber-950 mt-1">
                    {activeIncident.medicalAlert || activeIncident.medicalInfo || 'No critical allergies or conditions provided'}
                  </div>
                  <div className="text-xs text-amber-800 mt-1">
                    Emergency GPS Location Transmitted: Yes
                  </div>
                </div>
              </div>

              {/* Current GPS Location & "Open Location in Maps" Button */}
              {(() => {
                const lat = activeIncident.coordinates?.lat ?? activeIncident.latitude ?? 28.7291;
                const lng = activeIncident.coordinates?.lng ?? activeIncident.longitude ?? 77.1614;
                const accuracy = activeIncident.coordinates?.accuracy ?? activeIncident.accuracy;
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                          Victim GPS Location (Reported by Bystander)
                        </span>
                        <div className="text-sm sm:text-base font-semibold text-slate-900 mt-1 font-mono">
                          {activeIncident.locationAddress || activeIncident.locationDescription || `Victim: ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center flex-wrap gap-x-2">
                          <span>Victim: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                          {accuracy !== undefined && (
                            <span className="font-sans text-slate-700 bg-slate-200/90 px-1.5 py-0.5 rounded text-[11px] font-medium">
                              Accuracy: ~{Math.round(accuracy)}m
                            </span>
                          )}
                        </div>

                        {hasAmbulanceLocation && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 text-xs font-mono space-y-0.5">
                            <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                              <span>📍 Ambulance location detected</span>
                              {ambulanceLocation?.accuracy !== undefined && (
                                <span className="font-normal text-[11px] text-slate-600">
                                  (Accuracy: ~{Math.round(ambulanceLocation.accuracy)}m)
                                </span>
                              )}
                            </div>
                            <div className="text-blue-700 font-medium">
                              Ambulance: {ambulanceLocation.latitude.toFixed(5)}, {ambulanceLocation.longitude.toFixed(5)}
                            </div>
                            {currentDistanceKm !== null && (
                              <div className="font-bold text-slate-900">
                                Distance: {currentDistanceKm < 0.1 ? '< 0.1 km' : `${currentDistanceKm.toFixed(1)} km`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Open Location in Maps Button (Kept visible in all statuses) */}
                      <a
                        id={`btn-open-location-maps-${activeIncident.id}`}
                        href={getMapUrl(lat, lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Map className="w-4 h-4" />
                        <span>Open Location in Maps</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-blue-200" />
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* Prototype Notice */}
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Emergency Dispatch Prototype:</strong> This interface manages emergency requests within the prototype application. Status updates are synchronized live with the Bystander Portal.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              No incident selected in ambulance queue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
