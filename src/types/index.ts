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
  brand: string;
  model: string;
  type?: VehicleType;
  licensePlate: string;
  year: number;
  images?: { url: string; id: string }[];
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleInput {
  brand: string;
  model: string;
  type?: VehicleType;
  licensePlate: string;
  year: number;
  images?: {
    uri: string;
    name: string;
    type: string;
  }[];
}

export type VehicleAccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface VehicleAccessRequestDocument {
  url: string;
  id: string;
  mimeType: string;
  name?: string;
}

export interface VehicleAccessRequest {
  _id: string;
  licensePlate: string;
  relationship: string;
  note?: string;
  status: VehicleAccessRequestStatus;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
  requesterId?: string | Pick<User, '_id' | 'displayName' | 'phone'>;
  vehicleId?: Vehicle;
  documents?: VehicleAccessRequestDocument[];
}

export interface VehicleAccessRequestInput {
  licensePlate: string;
  relationship: string;
  note?: string;
  documents?: {
    uri: string;
    name: string;
    type: string;
  }[];
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  vehicleType?: VehicleType;
  categoryId?: {
    _id: string;
    name: string;
    description?: string;
    isActive?: boolean;
  } | null;
  estimatedDuration: number;
  price: number;
  isActive?: boolean;
}

export interface ServiceCategory {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AppointmentPaymentMethod = 'cash' | 'payos';
export type AppointmentPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'cancelled';

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
  subtotalPrice?: number;
  discountAmount?: number;
  totalPrice: number;
  finalAmount?: number;
  paymentMethod?: AppointmentPaymentMethod | null;
  paymentStatus: AppointmentPaymentStatus;
  paidAt?: string | null;
  membershipTierDiscountSnapshot?: {
    name?: string;
    discountPercent?: number;
    discountAmount?: number;
  } | null;
  promotionId?:
    | string
    | {
        _id: string;
        title: string;
        code: string;
        type: 'percentage' | 'fixed_amount' | 'bonus_points' | 'free_service';
        discountValue?: number | null;
        bonusPoints?: number | null;
      }
    | null;
  promotionDiscountSnapshot?: {
    title?: string;
    code?: string;
    type?: 'percentage' | 'fixed_amount' | 'bonus_points' | 'free_service';
    discountValue?: number | null;
    bonusPoints?: number | null;
    discountAmount?: number;
  } | null;
  rewardRedemptionId?:
    | string
    | {
        _id: string;
        rewardId?:
          | string
          | {
              _id: string;
              name: string;
              discountType: 'percentage' | 'fixed_amount';
              discountValue: number;
            };
        status: 'available' | 'used' | 'expired' | 'cancelled';
      }
    | null;
  rewardDiscountSnapshot?: {
    name?: string;
    discountType?: 'percentage' | 'fixed_amount';
    discountValue?: number | null;
    pointsUsed?: number | null;
    discountAmount?: number;
  } | null;
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
  paymentStatus?: AppointmentPaymentStatus;
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
  promotionId?: string;
  rewardRedemptionId?: string;
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
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
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


