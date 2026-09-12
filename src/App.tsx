import React, { useState, useEffect, useCallback } from 'react';
import {
  PortalType,
  VehicleRecord,
  EmergencyIncident,
  EmergencyRequest,
  EmergencyRequestStatus,
  OperatorUser,
  AdminUser,
} from './types';
import {
  SAMPLE_VEHICLE,
  INITIAL_EMERGENCY_REQUESTS,
  INITIAL_INCIDENTS,
  NEARBY_HOSPITALS,
  REGISTERED_VEHICLES,
} from './data/mockData';
import {
  parseCurrentRoute,
  getEmergencyUrl,
} from './utils/emergencyUrl';
import { BystanderHeader } from './components/navigation/BystanderHeader';
import { AmbulanceHeader } from './components/navigation/AmbulanceHeader';
import { AdminHeader } from './components/navigation/AdminHeader';
import { PrototypeRoleDock } from './components/navigation/PrototypeRoleDock';
import { AmbulanceLogin } from './components/auth/AmbulanceLogin';
import { AdminLogin } from './components/auth/AdminLogin';
import { BystanderPortal } from './components/bystander/BystanderPortal';
import { AmbulanceDashboard } from './components/ambulance/AmbulanceDashboard';
import { AdminPortal } from './components/admin/AdminPortal';
import { emergencySyncService } from './services/emergencySyncService';
import {
  QrCode,
  AlertTriangle,
  Search,
  Phone,
} from 'lucide-react';

// Build initial map from unified emergency requests
const buildInitialRequestsMap = (): Record<string, EmergencyRequest> => {
  const map: Record<string, EmergencyRequest> = {};
  for (const req of INITIAL_EMERGENCY_REQUESTS) {
    if (req.emergencyId) map[req.emergencyId] = req;
    if (req.vehiclePlate) map[req.vehiclePlate] = req;
  }
  return map;
};

const getStoredAmbulanceUser = (): OperatorUser | null => {
  try {
    const data = sessionStorage.getItem('resqride_ambulance_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const getStoredAdminUser = (): AdminUser | null => {
  try {
    const data = sessionStorage.getItem('resqride_admin_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [currentPortal, setCurrentPortal] = useState<PortalType>('bystander');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(REGISTERED_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord>(SAMPLE_VEHICLE);
  const [notFoundEmergencyId, setNotFoundEmergencyId] = useState<string | null>(null);
  const [simulatedScanInput, setSimulatedScanInput] = useState<string>('');

  // Authentication State for Protected Modules
  const [ambulanceUser, setAmbulanceUser] = useState<OperatorUser | null>(getStoredAmbulanceUser);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(getStoredAdminUser);

  // Synchronized emergency requests across Bystander Portal and Ambulance Dashboard
  const [emergencyRequests, setEmergencyRequests] =
    useState<EmergencyRequest[]>(INITIAL_EMERGENCY_REQUESTS);
  const [requestsByEmergencyId, setRequestsByEmergencyId] =
    useState<Record<string, EmergencyRequest>>(buildInitialRequestsMap);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);

  // Sync state helpers
  const syncRequestsState = useCallback((requests: EmergencyRequest[]) => {
    if (!requests || requests.length === 0) return;
    setEmergencyRequests(requests);
    const map: Record<string, EmergencyRequest> = {};
    for (const r of requests) {
      if (r.emergencyId) map[r.emergencyId] = r;
      if (r.vehiclePlate) map[r.vehiclePlate] = r;
    }
    setRequestsByEmergencyId(map);
  }, []);

  const syncSingleRequestState = useCallback((req: EmergencyRequest) => {
    if (!req) return;
    setEmergencyRequests((prev) => {
      const cleanPlate = req.vehiclePlate ? req.vehiclePlate.replace(/\s+/g, '').toLowerCase() : '';
      const cleanId = req.emergencyId ? req.emergencyId.toLowerCase() : '';

      const idx = prev.findIndex(
        (r) =>
          r.id === req.id ||
          (cleanId && r.emergencyId && r.emergencyId.toLowerCase() === cleanId) ||
          (cleanPlate && r.vehiclePlate && r.vehiclePlate.replace(/\s+/g, '').toLowerCase() === cleanPlate)
      );

      if (idx >= 0) {
        // If already Arrived, keep status permanently as Arrived
        if (prev[idx].status === 'Arrived' && req.status !== 'Arrived') {
          return prev;
        }
        const copy = [...prev];
        copy[idx] = req;
        return copy;
      }
      return [req, ...prev];
    });

    setRequestsByEmergencyId((prev) => {
      const next = { ...prev };
      const keyId = req.emergencyId;
      const keyPlate = req.vehiclePlate;
      if (keyId && prev[keyId]?.status === 'Arrived' && req.status !== 'Arrived') {
        // preserve Arrived
      } else if (keyId) {
        next[keyId] = req;
      }
      if (keyPlate && prev[keyPlate]?.status === 'Arrived' && req.status !== 'Arrived') {
        // preserve Arrived
      } else if (keyPlate) {
        next[keyPlate] = req;
      }
      return next;
    });
  }, []);

  // Shared backend synchronization via Server-Sent Events & REST
  useEffect(() => {
    let isMounted = true;

    // 1. Initial authoritative load from shared backend
    emergencySyncService
      .getEmergencyRequests()
      .then((backendRequests) => {
        if (isMounted && backendRequests && backendRequests.length > 0) {
          syncRequestsState(backendRequests);
        }
      })
      .catch((err) => {
        console.warn('[App] Could not fetch initial emergency requests from backend:', err);
      });

    // 2. Fetch shared registered vehicles if available
    emergencySyncService
      .getVehicles()
      .then((backendVehicles) => {
        if (isMounted && backendVehicles && backendVehicles.length > 0) {
          setVehicles(backendVehicles);
        }
      })
      .catch(() => {});

    // 3. Real-time push updates via SSE (with auto-reconnect and safety polling)
    const unsubscribe = emergencySyncService.subscribeToEmergencyUpdates((event) => {
      if (!isMounted) return;
      if (event.type === 'connected' && Array.isArray(event.data) && event.data.length > 0) {
        syncRequestsState(event.data);
      } else if (event.type === 'emergency_request_created' || event.type === 'emergency_request_updated') {
        syncSingleRequestState(event.data);
      } else if (event.type === 'sync' && Array.isArray(event.data)) {
        syncRequestsState(event.data);
      } else if (event.type === 'vehicle_registered') {
        setVehicles((prev) => {
          if (prev.some((v) => v.qrCodeId === event.data.qrCodeId)) return prev;
          return [event.data, ...prev];
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncRequestsState, syncSingleRequestState]);

  // Navigate between isolated routes
  const navigateRoute = useCallback(
    (route: PortalType, emergencyId?: string, pushState = true) => {
      setCurrentPortal(route);

      if (route === 'bystander') {
        const targetId = emergencyId || selectedVehicle.qrCodeId;
        const cleanId = targetId.trim();

        const matched = vehicles.find(
          (v) =>
            v.qrCodeId.toLowerCase() === cleanId.toLowerCase() ||
            v.plateNumber.replace(/\s+/g, '').toLowerCase() ===
              cleanId.replace(/\s+/g, '').toLowerCase()
        );

        if (matched) {
          setSelectedVehicle(matched);
          setNotFoundEmergencyId(null);
          if (pushState) {
            window.history.pushState(null, '', `/emergency/${matched.qrCodeId}`);
          }
        } else {
          setNotFoundEmergencyId(cleanId);
          if (pushState) {
            window.history.pushState(null, '', `/emergency/${cleanId}`);
          }
        }
      } else if (route === 'ambulance') {
        if (pushState) {
          window.history.pushState(null, '', '/ambulance');
        }
      } else if (route === 'admin') {
        if (pushState) {
          window.history.pushState(null, '', '/admin');
        }
      }
    },
    [vehicles, selectedVehicle.qrCodeId]
  );

  // Parse location and set initial route
  useEffect(() => {
    const handleLocationChange = () => {
      const parsed = parseCurrentRoute();

      if (parsed.type === 'ambulance') {
        setCurrentPortal('ambulance');
      } else if (parsed.type === 'admin') {
        setCurrentPortal('admin');
      } else {
        setCurrentPortal('bystander');
        if (parsed.emergencyId) {
          const cleanId = parsed.emergencyId.trim();
          const matched = vehicles.find(
            (v) =>
              v.qrCodeId.toLowerCase() === cleanId.toLowerCase() ||
              v.plateNumber.replace(/\s+/g, '').toLowerCase() ===
                cleanId.replace(/\s+/g, '').toLowerCase()
          );

          if (matched) {
            setSelectedVehicle(matched);
            setNotFoundEmergencyId(null);
          } else {
            setNotFoundEmergencyId(cleanId);
          }
        }
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [vehicles]);

  // Handle Operator Login
  const handleAmbulanceLogin = (user: OperatorUser) => {
    try {
      sessionStorage.setItem('resqride_ambulance_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    setAmbulanceUser(user);
  };

  // Handle Operator Sign Out
  const handleAmbulanceSignOut = () => {
    try {
      sessionStorage.removeItem('resqride_ambulance_user');
    } catch (e) {
      console.error(e);
    }
    setAmbulanceUser(null);
  };

  // Handle Admin Login
  const handleAdminLogin = (user: AdminUser) => {
    try {
      sessionStorage.setItem('resqride_admin_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    setAdminUser(user);
  };

  // Handle Admin Sign Out
  const handleAdminSignOut = () => {
    try {
      sessionStorage.removeItem('resqride_admin_user');
    } catch (e) {
      console.error(e);
    }
    setAdminUser(null);
  };

  // When a new vehicle is registered in the Admin portal
  const handleRegisterVehicle = async (newVehicle: VehicleRecord) => {
    setVehicles((prev) => [newVehicle, ...prev]);
    setSelectedVehicle(newVehicle);
    setNotFoundEmergencyId(null);
    try {
      await emergencySyncService.registerVehicle(newVehicle);
    } catch (e) {
      console.warn('Failed to persist registered vehicle to shared backend:', e);
    }
  };

  // When bystander requests an ambulance with location & emergency details
  const handleRequestAmbulance = async (payload: {
    emergencyId: string;
    vehiclePlate: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    locationAddress?: string;
    timestamp: string;
    bloodGroup?: string;
    medicalInfo?: string;
  }) => {
    const emergencyId = payload.emergencyId || selectedVehicle.qrCodeId;
    setActiveTrackingId(emergencyId);

    try {
      const savedRequest = await emergencySyncService.sendEmergencyRequest({
        ...payload,
        emergencyId,
        riderName: selectedVehicle.ownerName,
      });

      syncSingleRequestState(savedRequest);
    } catch (err) {
      console.error('[App] Failed to dispatch emergency request to shared backend:', err);

      // Fallback local update
      const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackRequest: EmergencyRequest = {
        id: reqId,
        emergencyId: emergencyId,
        vehiclePlate: payload.vehiclePlate,
        riderName: selectedVehicle.ownerName,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        locationDescription:
          payload.locationAddress ||
          `GPS Coordinates: ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`,
        locationAddress:
          payload.locationAddress ||
          `GPS Coordinates: ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`,
        coordinates: {
          lat: payload.latitude,
          lng: payload.longitude,
          accuracy: payload.accuracy,
        },
        timestamp: payload.timestamp,
        timeReported: payload.timestamp,
        bloodGroup: payload.bloodGroup || selectedVehicle.bloodGroup,
        medicalInfo:
          payload.medicalInfo ||
          selectedVehicle.allergies.join(', ') ||
          'No known allergies recorded',
        medicalAlert:
          payload.medicalInfo ||
          selectedVehicle.allergies.join(', ') ||
          'No known allergies recorded',
        status: 'Waiting for Response',
        urgency: 'critical',
        assignedAmbulanceUnit: 'Ambulance Unit #104',
        ambulanceEtaMinutes: 8,
        primaryContactCalled: false,
        destinationHospital: 'Max Trauma & Emergency Care',
        isNewEmergency: true,
      };

      syncSingleRequestState(fallbackRequest);
    }
  };

  // When ambulance operator updates status in the Ambulance Dashboard
  // Supports the 4-step flow: Waiting for Response -> Accepted -> En Route -> Arrived
  const handleUpdateEmergencyRequestStatus = async (
    requestIdOrEmergencyId: string,
    newStatus: EmergencyRequestStatus | string,
    acceptedTime?: string
  ) => {
    let normalizedStatus: EmergencyRequestStatus = 'Waiting for Response';
    const lower = newStatus.toLowerCase().replace(/[_\s]+/g, ' ').trim();
    if (lower.includes('accept') || lower.includes('dispatch')) {
      normalizedStatus = 'Accepted';
    } else if (lower.includes('route') || lower.includes('transit') || lower.includes('way')) {
      normalizedStatus = 'En Route';
    } else if (lower.includes('arriv') || lower.includes('scene')) {
      normalizedStatus = 'Arrived';
    } else if (lower.includes('wait') || lower.includes('pending')) {
      normalizedStatus = 'Waiting for Response';
    }

    let formattedAcceptedTime = acceptedTime;
    if (normalizedStatus === 'Accepted' && !formattedAcceptedTime) {
      formattedAcceptedTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }

    const STATUS_RANK: Record<string, number> = {
      'waiting for response': 1,
      'accepted': 2,
      'en route': 3,
      'arrived': 4,
    };

    const targetRank = STATUS_RANK[normalizedStatus.toLowerCase()] || 1;

    // Check existing record
    const existingReq = emergencyRequests.find(
      (req) =>
        req.id === requestIdOrEmergencyId ||
        req.emergencyId === requestIdOrEmergencyId ||
        req.vehiclePlate.replace(/\s+/g, '').toLowerCase() ===
          requestIdOrEmergencyId.replace(/\s+/g, '').toLowerCase()
    );

    if (existingReq) {
      const currentRank = STATUS_RANK[existingReq.status.toLowerCase()] || 1;
      // 1. Once Arrived, status is permanently Arrived
      if (existingReq.status === 'Arrived' || currentRank >= 4) {
        console.warn('[App] Status change blocked: Emergency is already Arrived and permanent.');
        return;
      }
      // 2. Flow is strictly one-way: cannot move backward
      if (targetRank < currentRank) {
        console.warn(`[App] Status change blocked: Flow is strictly one-way (${existingReq.status} -> ${normalizedStatus}).`);
        return;
      }
    }

    // Optimistic local update so UI responds instantly without any latency
    setEmergencyRequests((prev) =>
      prev.map((req) => {
        const matches =
          req.id === requestIdOrEmergencyId ||
          req.emergencyId === requestIdOrEmergencyId ||
          req.vehiclePlate.replace(/\s+/g, '').toLowerCase() ===
            requestIdOrEmergencyId.replace(/\s+/g, '').toLowerCase();

        if (matches) {
          const curRank = STATUS_RANK[req.status.toLowerCase()] || 1;
          if (req.status === 'Arrived' || curRank >= 4 || targetRank < curRank) {
            return req;
          }

          return {
            ...req,
            status: normalizedStatus,
            acceptedTime: formattedAcceptedTime || req.acceptedTime,
            isNewEmergency: false,
          };
        }
        return req;
      })
    );

    try {
      const updated = await emergencySyncService.updateEmergencyStatus(
        requestIdOrEmergencyId,
        normalizedStatus,
        formattedAcceptedTime
      );
      if (updated) {
        syncSingleRequestState(updated);
      }
    } catch (err) {
      console.error('[App] Failed to update emergency status on shared backend:', err);
    }
  };

  // Legacy alias for compatibility
  const handleUpdateIncidentStatus = handleUpdateEmergencyRequestStatus;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* 1. BYSTANDER MODULE: Public Emergency Interface */}
      {currentPortal === 'bystander' && (
        <>
          <BystanderHeader
            onCallEmergency={() => {
              window.location.href = 'tel:112';
            }}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="w-full space-y-4">
              {/* Direct QR Route Testing Bar */}
              <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Public Emergency QR Route:</span>
                        <span className="font-mono text-red-600 font-extrabold">
                          /emergency/{selectedVehicle.qrCodeId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        When scanned, smartphone cameras open this vehicle's emergency record directly. No login required.
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Public Route
                  </span>
                </div>

                {/* Interactive QR Scan Simulator Bar for Testing Any Vehicle */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Simulate QR scan (e.g. RQR-DL-4092, RQR-AP-1122)..."
                      value={simulatedScanInput}
                      onChange={(e) => setSimulatedScanInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && simulatedScanInput.trim()) {
                          navigateRoute('bystander', simulatedScanInput.trim());
                          setSimulatedScanInput('');
                        }
                      }}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (simulatedScanInput.trim()) {
                        navigateRoute('bystander', simulatedScanInput.trim());
                        setSimulatedScanInput('');
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-colors shrink-0"
                  >
                    Simulate Scan
                  </button>
                </div>
              </div>

              {/* Vehicle Not Found State (Strictly Public - No Admin Links) */}
              {notFoundEmergencyId ? (
                <div className="max-w-xl mx-auto bg-white border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-4">
                  <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      Emergency Record Not Found
                    </h2>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      The scanned Emergency ID{' '}
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {notFoundEmergencyId}
                      </span>{' '}
                      does not match any registered vehicle in this emergency database.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-3">
                    <p className="text-slate-500 text-xs">
                      If this is an active road collision or medical crisis, contact national emergency dispatch immediately.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <a
                        href="tel:112"
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Emergency (112)</span>
                      </a>
                      <button
                        onClick={() => {
                          setNotFoundEmergencyId(null);
                          navigateRoute('bystander', vehicles[0].qrCodeId);
                        }}
                        className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                      >
                        Return to Safety Portal
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Bystander Emergency Portal - Zero Admin/Ambulance Links */
                (() => {
                  const activeRequest =
                    requestsByEmergencyId[selectedVehicle.qrCodeId] ||
                    requestsByEmergencyId[selectedVehicle.plateNumber] ||
                    emergencyRequests.find(
                      (r) =>
                        (r.emergencyId && r.emergencyId.toLowerCase() === selectedVehicle.qrCodeId.toLowerCase()) ||
                        (r.vehiclePlate &&
                          r.vehiclePlate.replace(/\s+/g, '').toLowerCase() ===
                            selectedVehicle.plateNumber.replace(/\s+/g, '').toLowerCase())
                    ) ||
                    null;
                  const isTracking =
                    activeTrackingId === selectedVehicle.qrCodeId;

                  return (
                    <BystanderPortal
                      vehicle={selectedVehicle}
                      hospitals={NEARBY_HOSPITALS}
                      onRequestAmbulance={handleRequestAmbulance}
                      ambulanceRequested={isTracking}
                      latestRequest={activeRequest}
                      onResetRequest={() => setActiveTrackingId(null)}
                      onViewStatus={() => setActiveTrackingId(selectedVehicle.qrCodeId)}
                    />
                  );
                })()
              )}
            </div>
          </main>
        </>
      )}

      {/* 2. AMBULANCE MODULE: Protected CAD Route (/ambulance) */}
      {currentPortal === 'ambulance' && (
        <>
          {ambulanceUser ? (
            <>
              <AmbulanceHeader user={ambulanceUser} onSignOut={handleAmbulanceSignOut} />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <AmbulanceDashboard
                  emergencyRequests={emergencyRequests}
                  incidents={emergencyRequests}
                  hospitals={NEARBY_HOSPITALS}
                  onUpdateStatus={handleUpdateEmergencyRequestStatus}
                  onUpdateEmergencyRequestStatus={handleUpdateEmergencyRequestStatus}
                  onUpdateIncidentStatus={handleUpdateEmergencyRequestStatus}
                />
              </main>
            </>
          ) : (
            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
              <AmbulanceLogin
                onLoginSuccess={handleAmbulanceLogin}
                onNavigateToPublic={() => navigateRoute('bystander', selectedVehicle.qrCodeId)}
              />
            </main>
          )}
        </>
      )}

      {/* 3. GOVERNMENT / ADMIN MODULE: Protected Route (/admin) */}
      {currentPortal === 'admin' && (
        <>
          {adminUser ? (
            <>
              <AdminHeader user={adminUser} onSignOut={handleAdminSignOut} />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <AdminPortal
                  vehicles={vehicles}
                  incidents={emergencyRequests}
                  onVehicleRegistered={handleRegisterVehicle}
                  onSelectVehicleForDemo={(veh) => {
                    navigateRoute('bystander', veh.qrCodeId);
                  }}
                />
              </main>
            </>
          ) : (
            <main className="flex-1 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
              <AdminLogin
                onLoginSuccess={handleAdminLogin}
                onNavigateToPublic={() => navigateRoute('bystander', selectedVehicle.qrCodeId)}
              />
            </main>
          )}
        </>
      )}

      {/* Prototype Role Dock (Reviewer Utility for iframe testing of all 3 isolated routes) */}
      <PrototypeRoleDock
        currentRoute={currentPortal}
        currentEmergencyId={selectedVehicle.qrCodeId}
        ambulanceUser={ambulanceUser}
        adminUser={adminUser}
        onNavigateRoute={navigateRoute}
      />
    </div>
  );
}
