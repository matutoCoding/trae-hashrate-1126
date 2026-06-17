export interface Station {
  id: string;
  name: string;
  location: string;
  status: 'idle' | 'occupied' | 'maintenance';
  capacity: number;
  todayAppointments: number;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: number;
  total: number;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  donorId: string;
  donorName: string;
  idCard: string;
  phone: string;
  stationId: string;
  stationName: string;
  appointmentDate: string;
  timeSlot: string;
  timeRange: string;
  status: AppointmentStatus;
  supplyUsages: string[];
  createdAt: string;
  completedAt?: string;
}

export type SupplyType = 'needle' | 'bag' | 'tube' | 'swab';

export interface SupplyBatch {
  id: string;
  batchNo: string;
  supplyType: SupplyType;
  supplyTypeName: string;
  totalQuantity: number;
  remainingQuantity: number;
  expiryDate: string;
  createdAt: string;
}

export interface SupplyUsage {
  id: string;
  batchId: string;
  batchNo: string;
  appointmentId: string;
  donorName: string;
  quantity: number;
  direction: string;
  usedAt: string;
}

export type BloodType = 'A' | 'B' | 'AB' | 'O' | 'unknown';

export interface Donor {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  bloodType: BloodType;
  lastDonationDate: string | null;
  donationType: 'whole' | 'component' | null;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  date: string;
  type: 'whole' | 'component';
  volume: number;
  stationName: string;
}

export interface StationAllocationResult {
  stationId: string;
  stationName: string;
  score: number;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  daysRemaining?: number;
  nextDonationDate?: string;
}

export type TabType = 'home' | 'appointment' | 'schedule' | 'supplies' | 'records';
