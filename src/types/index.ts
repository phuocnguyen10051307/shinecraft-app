export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  _id: string;
  phone: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  loyaltyPoints?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleType = 'car' | 'motorbike' | 'other';

export interface Vehicle {
  _id: string;
  customerId?: string | Pick<User, '_id' | 'displayName' | 'phone' | 'avatarUrl'>;
  type: VehicleType;
  brand: string;
  model: string;
  licensePlate: string;
  year: number;
  note?: string;
  images?: { url: string; id: string }[];
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
  customerId: Pick<User, '_id' | 'displayName' | 'phone' | 'avatarUrl'>;
  vehicleId: Vehicle;
  assignedStaffId: Pick<User, '_id' | 'displayName' | 'phone' | 'avatarUrl'> | null;
  services: AppointmentServiceSnapshot[];
  scheduledAt: string;
  status: AppointmentStatus;
  note?: string;
  totalEstimatedDuration: number;
  totalPrice: number;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  cancelReason?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceHistoryServiceSnapshot {
  serviceId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  estimatedDurationSnapshot: number;
}

export interface ServiceHistoryAppointmentSummary {
  _id: string;
  status: AppointmentStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
}

export interface ServiceHistory {
  _id: string;
  customerId: Pick<User, '_id' | 'displayName' | 'phone' | 'avatarUrl'>;
  vehicleId: Pick<Vehicle, '_id' | 'brand' | 'model' | 'licensePlate' | 'year'>;
  appointmentId: ServiceHistoryAppointmentSummary;
  services: ServiceHistoryServiceSnapshot[];
  totalPrice: number;
  totalEstimatedDuration: number;
  servicedAt: string;
  handledBy: Pick<User, '_id' | 'displayName' | 'phone' | 'avatarUrl'> | null;
  note?: string;
  nextMaintenanceDate?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentInput {
  vehicleId: string;
  services: { serviceId: string }[];
  scheduledAt: string;
  note?: string;
}

export interface MembershipTier {
  _id: string;
  name: string;
  minTotalEarnedPoints: number;
  discountPercent?: number | null;
  description?: string | null;
}

export interface LoyaltyAccount {
  _id: string;
  currentPoints: number;
  totalEarnedPoints: number;
  totalRedeemedPoints: number;
  totalExpiredPoints: number;
  membershipTierId?: MembershipTier | string | null;
}

export interface LoyaltyTransaction {
  _id: string;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  remainingPoints?: number | null;
  description?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface Reward {
  _id: string;
  name: string;
  description?: string | null;
  requiredPoints: number;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  quantity?: number | null;
  redeemedCount?: number;
  isActive?: boolean;
  expiredAt?: string | null;
}

export interface RewardRedemption {
  _id: string;
  rewardId?: Reward | string | null;
  pointsUsed: number;
  status: 'available' | 'used' | 'expired' | 'cancelled';
  redeemedAt?: string;
  usedAt?: string | null;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'appointment' | 'booking' | 'promotion' | 'maintenance' | 'loyalty' | 'system';
  relatedModel?: string | null;
  relatedId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Promotion {
  _id: string;
  title: string;
  description?: string | null;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'bonus_points' | 'free_service';
  discountValue?: number | null;
  bonusPoints?: number | null;
  targetType: 'all' | 'membership_tier' | 'service';
  membershipTierId?: MembershipTier | string | null;
  serviceId?: Service | string | null;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  usedCount?: number;
  minSpend?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardOverview {
  totalCustomers: number;
  totalVehicles: number;
  totalAppointments: number;
  totalCompletedAppointments: number;
  totalServicesCompleted: number;
  totalActivePromotions: number;
  totalLoyaltyMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  revenue: {
    total: number;
    source: string;
  };
}
