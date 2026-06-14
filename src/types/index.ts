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
