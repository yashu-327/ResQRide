import type { EmergencyRequest, EmergencyRequestStatus, VehicleRecord } from '../types';

export type EmergencySyncEvent =
  | { type: 'connected'; data: EmergencyRequest[] }
  | { type: 'emergency_request_created'; data: EmergencyRequest }
  | { type: 'emergency_request_updated'; data: EmergencyRequest }
  | { type: 'sync'; data: EmergencyRequest[] }
  | { type: 'vehicle_registered'; data: VehicleRecord };

export interface SendEmergencyPayload {
  emergencyId: string;
  vehiclePlate: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationAddress?: string;
  timestamp: string;
  bloodGroup?: string;
  medicalInfo?: string;
  riderName?: string;
}

class EmergencySyncService {
  private eventSource: EventSource | null = null;
  private listeners: Set<(event: EmergencySyncEvent) => void> = new Set();
  private pollIntervalId: any = null;
  private isPolling = false;

  /**
   * Fetch authoritative emergency requests from shared backend
   */
  async getEmergencyRequests(): Promise<EmergencyRequest[]> {
    try {
      const res = await fetch('/api/emergency-requests', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data.requests) ? data.requests : [];
    } catch (err) {
      console.warn('[EmergencySync] Failed to fetch emergency requests from backend:', err);
      throw err;
    }
  }

  /**
   * Dispatch a new emergency request or update existing for this vehicle
   */
  async sendEmergencyRequest(payload: SendEmergencyPayload): Promise<EmergencyRequest> {
    const res = await fetch('/api/emergency-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to create emergency request: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.request;
  }

  /**
   * Update the status of an emergency request (e.g. Accepted, En Route, Arrived)
   */
  async updateEmergencyStatus(
    idOrEmergencyId: string,
    status: EmergencyRequestStatus | string,
    acceptedTime?: string
  ): Promise<EmergencyRequest> {
    const res = await fetch(
      `/api/emergency-requests/${encodeURIComponent(idOrEmergencyId)}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status, acceptedTime }),
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to update emergency status: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.request;
  }

  /**
   * Fetch registered vehicles from shared backend
   */
  async getVehicles(): Promise<VehicleRecord[]> {
    try {
      const res = await fetch('/api/vehicles', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.vehicles) ? data.vehicles : [];
    } catch {
      return [];
    }
  }

  /**
   * Register a new vehicle to shared backend
   */
  async registerVehicle(vehicle: VehicleRecord): Promise<VehicleRecord> {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    const data = await res.json();
    return data.vehicle;
  }

  /**
   * Subscribe to real-time events across all devices using Server-Sent Events (SSE)
   * with automated reconnection and periodic safety sync
   */
  subscribeToEmergencyUpdates(listener: (event: EmergencySyncEvent) => void): () => void {
    this.listeners.add(listener);

    // If SSE connection is not yet initialized, initialize it
    if (!this.eventSource && typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      this.initEventSource();
    }

    // Start background safety polling if not running
    if (!this.pollIntervalId && typeof window !== 'undefined') {
      this.startSafetyPolling();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.teardown();
      }
    };
  }

  private initEventSource() {
    try {
      this.eventSource = new EventSource('/api/emergency-requests/events');

      this.eventSource.onmessage = (event) => {
        try {
          const parsed: EmergencySyncEvent = JSON.parse(event.data);
          this.notifyListeners(parsed);
        } catch {
          // Keepalive or unparseable event
        }
      };

      this.eventSource.onerror = () => {
        // EventSource will automatically attempt reconnection
        console.warn('[EmergencySync] SSE stream interrupted, reconnecting...');
      };
    } catch (e) {
      console.error('[EmergencySync] Could not initialize EventSource:', e);
    }
  }

  private startSafetyPolling() {
    // Polls every 4 seconds as a reliable backup (e.g. mobile lock screen recovery)
    this.pollIntervalId = setInterval(async () => {
      if (this.isPolling || this.listeners.size === 0) return;
      this.isPolling = true;
      try {
        const requests = await this.getEmergencyRequests();
        if (requests && requests.length > 0) {
          this.notifyListeners({ type: 'sync', data: requests });
        }
      } catch {
        // Silently swallow background sync errors
      } finally {
        this.isPolling = false;
      }
    }, 4000);
  }

  private notifyListeners(event: EmergencySyncEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[EmergencySync] Listener error:', err);
      }
    }
  }

  private teardown() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }
}

export const emergencySyncService = new EmergencySyncService();
