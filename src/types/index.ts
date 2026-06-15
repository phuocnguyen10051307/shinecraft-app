export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  _id: string;
  phone: string;
  displayName: string;
  role?: UserRole;
  avatarUrl?: string;
  loyaltyPoints?: number;
  isActive?: boolean;
}

export type VehicleType = 'car' | 'motorbike' | 'other';

export interface Vehicle {
  _id: string;
  type: VehicleType;
  brand: string;
  model: string;
  licensePlate: string;
  year: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleInput {
  type: VehicleType;
  brand: string;
  model: string;
  licensePlate: string;
  year: number;
  note?: string;
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  vehicleType: VehicleType;
  estimatedDuration: number;
  price: number;
  isActive?: boolean;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface AppointmentServiceSnapshot {
  serviceId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  estimatedDurationSnapshot: number;
}

export interface Appointment {
  _id: string;
  vehicleId: Vehicle;
  services: AppointmentServiceSnapshot[];
  scheduledAt: string;
  status: AppointmentStatus;
  note?: string;
  totalEstimatedDuration: number;
  totalPrice: number;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  cancelReason?: string | null;
}

export interface CreateAppointmentInput {
  vehicleId: string;
  services: { serviceId: string }[];
  scheduledAt: string;
  note?: string;
}
