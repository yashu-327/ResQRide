import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_EMERGENCY_REQUESTS, REGISTERED_VEHICLES } from './src/data/mockData.js';
import type { EmergencyRequest, EmergencyRequestStatus, VehicleRecord } from './src/types.js';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const EMERGENCY_DATA_FILE = path.join(DATA_DIR, 'emergency_requests.json');
const VEHICLES_DATA_FILE = path.join(DATA_DIR, 'vehicles.json');

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state backed by persistent files
let emergencyRequests: EmergencyRequest[] = [];
let registeredVehicles: VehicleRecord[] = [];

// Load or seed emergency requests
try {
  if (fs.existsSync(EMERGENCY_DATA_FILE)) {
    const raw = fs.readFileSync(EMERGENCY_DATA_FILE, 'utf-8');
    emergencyRequests = JSON.parse(raw);
    console.log(`[Storage] Loaded ${emergencyRequests.length} emergency requests from disk.`);
  } else {
    emergencyRequests = [...INITIAL_EMERGENCY_REQUESTS];
    fs.writeFileSync(EMERGENCY_DATA_FILE, JSON.stringify(emergencyRequests, null, 2));
    console.log(`[Storage] Initialized emergency requests file with ${emergencyRequests.length} records.`);
  }
} catch (err) {
  console.error('[Storage] Error loading emergency requests, using initial seed:', err);
  emergencyRequests = [...INITIAL_EMERGENCY_REQUESTS];
}

// Load or seed vehicles
try {
  if (fs.existsSync(VEHICLES_DATA_FILE)) {
    const raw = fs.readFileSync(VEHICLES_DATA_FILE, 'utf-8');
    registeredVehicles = JSON.parse(raw);
  } else {
    registeredVehicles = [...REGISTERED_VEHICLES];
    fs.writeFileSync(VEHICLES_DATA_FILE, JSON.stringify(registeredVehicles, null, 2));
  }
} catch (err) {
  registeredVehicles = [...REGISTERED_VEHICLES];
}

function persistEmergencyRequests() {
  try {
    fs.writeFileSync(EMERGENCY_DATA_FILE, JSON.stringify(emergencyRequests, null, 2));
  } catch (err) {
    console.error('[Storage] Failed to write emergency requests to disk:', err);
  }
}

function persistVehicles() {
  try {
    fs.writeFileSync(VEHICLES_DATA_FILE, JSON.stringify(registeredVehicles, null, 2));
  } catch (err) {
    console.error('[Storage] Failed to write vehicles to disk:', err);
  }
}

// Active Server-Sent Events clients for real-time live push
const sseClients = new Set<express.Response>();

function broadcastSSE(event: { type: string; data: any }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Keep-alive ping every 15 seconds to keep connections alive through proxies
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': keepalive\n\n');
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

async function startServer() {
  const app = express();

  app.use(express.json());

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      connectedClients: sseClients.size,
      requestsCount: emergencyRequests.length,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Real-time Server-Sent Events endpoint
  app.get('/api/emergency-requests/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Immediately notify client of successful connection with current requests
    res.write(`data: ${JSON.stringify({ type: 'connected', data: emergencyRequests })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // 3. Fetch all emergency requests
  app.get('/api/emergency-requests', (req, res) => {
    res.json({
      success: true,
      requests: emergencyRequests,
    });
  });

  // 4. Create or update an emergency request from a bystander device
  app.post('/api/emergency-requests', (req, res) => {
    const payload = req.body;
    if (!payload || !payload.vehiclePlate) {
      res.status(400).json({ success: false, error: 'Vehicle plate is required.' });
      return;
    }

    const emergencyId = payload.emergencyId || 'QR-NOT-SET';
    const cleanPlate = payload.vehiclePlate.replace(/\s+/g, '').toLowerCase();

    // Check if an existing request exists for this emergency ID or vehicle plate
    const existingIndex = emergencyRequests.findIndex(
      (r) =>
        (r.emergencyId && r.emergencyId.toLowerCase() === emergencyId.toLowerCase()) ||
        r.vehiclePlate.replace(/\s+/g, '').toLowerCase() === cleanPlate
    );

    let targetRequest: EmergencyRequest;

    if (existingIndex >= 0) {
      // Re-trigger / update existing request with latest real GPS coordinates and timestamp
      const existing = emergencyRequests[existingIndex];
      targetRequest = {
        ...existing,
        latitude: payload.latitude ?? existing.latitude,
        longitude: payload.longitude ?? existing.longitude,
        accuracy: payload.accuracy ?? existing.accuracy,
        coordinates: {
          lat: payload.latitude ?? existing.coordinates.lat,
          lng: payload.longitude ?? existing.coordinates.lng,
          accuracy: payload.accuracy ?? existing.coordinates.accuracy,
        },
        locationAddress: payload.locationAddress || existing.locationAddress,
        locationDescription: payload.locationAddress || existing.locationDescription,
        timestamp: payload.timestamp || existing.timestamp,
        timeReported: payload.timestamp || existing.timeReported,
        bloodGroup: payload.bloodGroup || existing.bloodGroup,
        medicalInfo: payload.medicalInfo || existing.medicalInfo,
        medicalAlert: payload.medicalInfo || existing.medicalAlert,
        riderName: payload.riderName || existing.riderName,
        status: 'Waiting for Response',
        acceptedTime: undefined,
        isNewEmergency: true,
      };

      // Move to top of queue for immediate visibility
      emergencyRequests.splice(existingIndex, 1);
      emergencyRequests.unshift(targetRequest);
    } else {
      // Brand new emergency request
      const reqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      targetRequest = {
        id: reqId,
        emergencyId: emergencyId,
        vehiclePlate: payload.vehiclePlate,
        riderName: payload.riderName || 'Vehicle Rider',
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        coordinates: {
          lat: payload.latitude,
          lng: payload.longitude,
          accuracy: payload.accuracy,
        },
        locationAddress:
          payload.locationAddress ||
          `GPS: ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`,
        locationDescription:
          payload.locationAddress ||
          `GPS: ${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)}`,
        timestamp: payload.timestamp,
        timeReported: payload.timestamp,
        bloodGroup: payload.bloodGroup || 'Not Specified',
        medicalInfo: payload.medicalInfo || 'No known allergies recorded',
        medicalAlert: payload.medicalInfo || 'No known allergies recorded',
        status: 'Waiting for Response',
        urgency: 'critical',
        assignedAmbulanceUnit: 'Ambulance Unit #104',
        primaryContactCalled: false,
        destinationHospital: 'Max Trauma & Emergency Care',
        isNewEmergency: true,
      };
      emergencyRequests.unshift(targetRequest);
    }

    persistEmergencyRequests();

    // Broadcast in real-time to all connected devices (e.g. Laptop A Ambulance Dashboard)
    broadcastSSE({
      type: 'emergency_request_created',
      data: targetRequest,
    });

    res.status(201).json({
      success: true,
      request: targetRequest,
      requests: emergencyRequests,
    });
  });

  // 5. Update emergency request status (e.g. operator on Laptop A clicks "Accepted", "En Route", "Arrived")
  const handleStatusUpdate = (req: express.Request, res: express.Response) => {
    const idOrEmergencyId = req.params.id;
    const { status, acceptedTime } = req.body;

    if (!idOrEmergencyId || !status) {
      res.status(400).json({ success: false, error: 'Request ID and new status are required.' });
      return;
    }

    let normalizedStatus: EmergencyRequestStatus = 'Waiting for Response';
    const lower = String(status).toLowerCase().replace(/[_\s]+/g, ' ').trim();
    if (lower.includes('accept') || lower.includes('dispatch')) {
      normalizedStatus = 'Accepted';
    } else if (lower.includes('route') || lower.includes('transit') || lower.includes('way')) {
      normalizedStatus = 'En Route';
    } else if (lower.includes('arriv') || lower.includes('scene')) {
      normalizedStatus = 'Arrived';
    } else if (lower.includes('wait') || lower.includes('pending')) {
      normalizedStatus = 'Waiting for Response';
    }

    const cleanTarget = idOrEmergencyId.replace(/\s+/g, '').toLowerCase();

    const targetIndex = emergencyRequests.findIndex(
      (r) =>
        r.id.toLowerCase() === idOrEmergencyId.toLowerCase() ||
        (r.emergencyId && r.emergencyId.toLowerCase() === idOrEmergencyId.toLowerCase()) ||
        r.vehiclePlate.replace(/\s+/g, '').toLowerCase() === cleanTarget
    );

    if (targetIndex === -1) {
      res.status(404).json({ success: false, error: 'Emergency request not found.' });
      return;
    }

    let formattedAcceptedTime = acceptedTime;
    if (normalizedStatus === 'Accepted' && !formattedAcceptedTime) {
      formattedAcceptedTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }

    const existing = emergencyRequests[targetIndex];

    const STATUS_RANK: Record<string, number> = {
      'waiting for response': 1,
      'accepted': 2,
      'en route': 3,
      'arrived': 4,
    };

    const currentRank = STATUS_RANK[existing.status.toLowerCase()] || 1;
    const targetRank = STATUS_RANK[normalizedStatus.toLowerCase()] || 1;

    // 1. Permanent Arrived guard: If already Arrived, status cannot be changed
    if (existing.status === 'Arrived' || currentRank >= 4) {
      res.status(400).json({
        success: false,
        error: 'Emergency request is already marked as Arrived and is permanently finalized.',
        request: existing,
        requests: emergencyRequests,
      });
      return;
    }

    // 2. Strictly one-way flow guard: do not allow any status to move backward
    if (targetRank < currentRank) {
      res.status(400).json({
        success: false,
        error: `Emergency status flow is strictly one-way. Cannot move backward from ${existing.status} to ${normalizedStatus}.`,
        request: existing,
        requests: emergencyRequests,
      });
      return;
    }

    const updated: EmergencyRequest = {
      ...existing,
      status: normalizedStatus,
      acceptedTime:
        normalizedStatus === 'Waiting for Response'
          ? undefined
          : formattedAcceptedTime || existing.acceptedTime,
      isNewEmergency: false,
    };

    emergencyRequests[targetIndex] = updated;
    persistEmergencyRequests();

    // Broadcast updated status in real-time to all connected devices (e.g. Mobile B)
    broadcastSSE({
      type: 'emergency_request_updated',
      data: updated,
    });

    res.json({
      success: true,
      request: updated,
      requests: emergencyRequests,
    });
  };

  app.patch('/api/emergency-requests/:id/status', handleStatusUpdate);
  app.put('/api/emergency-requests/:id', handleStatusUpdate);

  // 6. Reset requests to default demo seed (for testing)
  app.post('/api/emergency-requests/reset', (req, res) => {
    emergencyRequests = [...INITIAL_EMERGENCY_REQUESTS];
    persistEmergencyRequests();
    broadcastSSE({
      type: 'sync',
      data: emergencyRequests,
    });
    res.json({ success: true, requests: emergencyRequests });
  });

  // 7. Vehicles API
  app.get('/api/vehicles', (req, res) => {
    res.json({ success: true, vehicles: registeredVehicles });
  });

  app.post('/api/vehicles', (req, res) => {
    const newVehicle: VehicleRecord = req.body;
    if (!newVehicle || !newVehicle.plateNumber || !newVehicle.qrCodeId) {
      res.status(400).json({ success: false, error: 'Invalid vehicle payload.' });
      return;
    }
    registeredVehicles.unshift(newVehicle);
    persistVehicles();
    broadcastSSE({
      type: 'vehicle_registered',
      data: newVehicle,
    });
    res.status(201).json({ success: true, vehicle: newVehicle });
  });

  // Mount Vite middleware for development, static server for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ResQRide Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
