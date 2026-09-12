export type PortalType = 'bystander' | 'ambulance' | 'admin';

export interface OperatorUser {
  id: string;
  name: string;
  badgeNumber: string;
  station: string;
  role: 'ambulance_operator';
  email: string;
}

export interface AdminUser {
  id: string;
  name: string;
  department: string;
  role: 'government_admin';
  rtoZone: string;
  email: string;
}

export interface EmergencyContact {
  name: string;
  relation: 'Mother' | 'Father' | 'Wife' | 'Husband' | 'Brother' | 'Sister' | 'Other' | string;
  phone: string;
}

export interface VehicleRecord {
  id: string;
  plateNumber: string;
  vehicleType: string;
  vehicleModel: string;
  ownerName: string;
  ownerPhone?: string;
  age?: number;
  gender?: string;
  bloodGroup: string;
  allergies: string[];
  medicalNotes: string[];
  primaryContact: EmergencyContact;
  secondaryContact?: EmergencyContact;
  emergencyContacts?: EmergencyContact[];
  qrCodeId: string;
  rtoOffice: string;
  registeredDate: string;
  isDemo?: boolean;
  verificationStatus: 'verified' | 'pending' | 'renew_required';
}

export type EmergencyRequestStatus =
  | 'Waiting for Response'
  | 'Accepted'
  | 'En Route'
  | 'Arrived';

export const getEmergencyStatusRank = (status?: string): number => {
  if (!status) return 0;
  const s = String(status).toLowerCase().replace(/[_\s]+/g, ' ').trim();
  if (s.includes('arriv') || s.includes('scene')) return 3;
  if (s.includes('route') || s.includes('transit') || s.includes('way')) return 2;
  if (s.includes('accept') || s.includes('dispatch')) return 1;
  return 0; // 'Waiting for Response'
};

export type AmbulanceRequestStatus = EmergencyRequestStatus;

export type IncidentStatus =
  | 'Waiting for Response'
  | 'Accepted'
  | 'En Route'
  | 'Arrived'
  | 'waiting_response'
  | 'accepted'
  | 'en_route'
  | 'arrived';

export interface EmergencyRequest {
  id: string;
  emergencyId: string;
  vehiclePlate: string;
  riderName?: string;
  bloodGroup?: string;
  medicalInfo?: string;
  medicalAlert?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationAddress?: string;
  locationDescription?: string;
  coordinates?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  timeReported?: string;
  timestamp: string;
  acceptedTime?: string;
  status: EmergencyRequestStatus;
  urgency?: 'critical' | 'high' | 'moderate';
  assignedAmbulanceUnit?: string;
  ambulanceEtaMinutes?: number;
  destinationHospital?: string;
  primaryContactCalled?: boolean;
  isNewEmergency?: boolean;
}

export type EmergencyIncident = EmergencyRequest;

export interface HospitalInfo {
  id: string;
  name: string;
  distance: string;
  eta: string;
  address: string;
  type: string;
  emergencyContact: string;
  emergencyPhone?: string;
  traumaCareReady: boolean;
  hasIcuBeds: boolean;
}
