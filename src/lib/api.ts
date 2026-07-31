import { Platform } from 'react-native';

import { tokenStorage } from '@/lib/storage';
import type {
  Appointment,
  AppointmentPaymentStatus,
  AppointmentStatus,
  CreateAppointmentInput,
  DashboardOverview,
  LoyaltyAccount,
  LoyaltyTransaction,
  MembershipTier,
  NotificationItem,
  Promotion,
  Reward,
  RewardRedemption,
  Service,
  ServiceCategory,
  ServiceHistory,
  User,
  Vehicle,
  VehicleAccessRequest,
  VehicleAccessRequestInput,
  VehicleInput,
} from '@/types';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? `http://${fallbackHost}:3000/api`;
const REQUEST_TIMEOUT_MS = 10_000;

interface ApiEnvelope<T> {
  data: T;
  message?: string;
  code?: string;
  pagination?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & { token?: string | null };

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = options.token === undefined ? await tokenStorage.get() : options.token;
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>>;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) await tokenStorage.remove();
      throw new ApiError(
        payload.message || 'Khong the ket noi den may chu.',
        response.status,
        payload.code,
      );
    }
    return payload as ApiEnvelope<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'May chu phan hoi qua lau. Vui long thu lai.'
        : `Khong the ket noi den API tai ${API_URL}.`;
    throw new ApiError(message, 0);
  } finally {
    clearTimeout(timeout);
  }
}

const toVehicleFormData = (input: Partial<VehicleInput>) => {
  const data = new FormData();
  if (input.brand !== undefined) data.append('brand', input.brand.trim());
  if (input.model !== undefined) data.append('model', input.model.trim());
  if (input.licensePlate !== undefined) {
    data.append('licensePlate', input.licensePlate.replace(/\s+/g, '').toUpperCase());
  }
  if (input.year !== undefined) data.append('year', String(input.year));
  input.images?.forEach((image, index) => {
    data.append('files', {
      uri: image.uri,
      name: image.name || `vehicle-${index + 1}.jpg`,
      type: image.type || 'image/jpeg',
    } as never);
  });
  return data;
};

const toVehicleAccessRequestFormData = (input: VehicleAccessRequestInput) => {
  const data = new FormData();
  data.append('licensePlate', input.licensePlate.replace(/\s+/g, '').toUpperCase());
  data.append('relationship', input.relationship.trim());
  if (input.note?.trim()) data.append('note', input.note.trim());
  input.documents?.forEach((document, index) => {
    data.append('documents', {
      uri: document.uri,
      name: document.name || `document-${index + 1}`,
      type: document.type || 'application/octet-stream',
    } as never);
  });
  return data;
};

const unwrapList = async <T>(path: string) => (await request<T[]>(path)).data;

export const authApi = {
  signIn: async (phone: string, password: string) =>
    (
      await request<{ user: User; accessToken: string }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim(), password }),
        token: null,
      })
    ).data,
  signUp: async (input: { phone: string; password: string; firstName: string; lastName: string }) =>
    (
      await request<User>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          phone: input.phone.trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
        }),
        token: null,
      })
    ).data,
  me: async (token?: string) => (await request<User>('/auth/me', { token })).data,
  signOut: async () => {
    try {
      await request('/auth/signout', { method: 'POST' });
    } catch {
      // Dang xuat cuc bo van phai hoan tat neu may chu khong kha dung.
    }
  },
};

export const vehiclesApi = {
  list: async (role: User['role']) =>
    (
      await request<Vehicle[]>(role === 'customer' ? '/vehicles/me?limit=100' : '/vehicles?limit=100')
    ).data,
  create: async (input: VehicleInput) =>
    (await request<Vehicle>('/vehicles', { method: 'POST', body: toVehicleFormData(input) })).data,
  update: async (id: string, input: VehicleInput) =>
    (
      await request<Vehicle>(`/vehicles/${id}`, {
        method: 'PATCH',
        body: toVehicleFormData(input),
      })
    ).data,
  remove: async (id: string) => request(`/vehicles/${id}`, { method: 'DELETE' }),
};

export const vehicleAccessRequestsApi = {
  create: async (input: VehicleAccessRequestInput) =>
    (
      await request<VehicleAccessRequest>('/vehicle-access-requests', {
        method: 'POST',
        body: toVehicleAccessRequestFormData(input),
      })
    ).data,
  listMine: async () => (await request<VehicleAccessRequest[]>('/vehicle-access-requests/me')).data,
};

export const usersApi = {
  updateMe: async (displayName: string) =>
    (
      await request<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: displayName.trim() }),
      })
    ).data,
  list: async () => (await request<User[]>('/users?limit=100')).data,
  listStaffs: async () => (await request<User[]>('/users/staffs?limit=100')).data,
  update: async (id: string, input: { role?: User['role']; isActive?: boolean }) =>
    (
      await request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    ).data,
};

export const serviceCategoriesApi = {
  listActive: async () => unwrapList<ServiceCategory>('/service-categories/active?limit=100'),
};

export const servicesApi = {
  listActive: async () => (await request<Service[]>('/services/active?limit=100')).data,
  list: async () => (await request<Service[]>('/services?limit=100')).data,
  getById: async (id: string) => (await request<Service>(`/services/${id}`)).data,
};

export const appointmentsApi = {
  list: async (role: User['role']) => {
    const path =
      role === 'admin'
        ? '/appointments?limit=100'
        : role === 'staff'
          ? '/appointments/staff/my?limit=100'
          : '/appointments/my?limit=100';
    return (await request<Appointment[]>(path)).data;
  },
  create: async (input: CreateAppointmentInput) =>
    (
      await request<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          note: input.note?.trim() || undefined,
          promotionId: input.promotionId || undefined,
          rewardRedemptionId: input.rewardRedemptionId || undefined,
        }),
      })
    ).data,
  cancelMine: async (appointmentId: string, cancelReason?: string) =>
    (
      await request<Appointment>(`/appointments/my/${appointmentId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ cancelReason: cancelReason?.trim() || undefined }),
      })
    ).data,
  updateStatus: async (appointmentId: string, status: AppointmentStatus) =>
    (
      await request<Appointment>(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    ).data,
  updatePaymentStatus: async (appointmentId: string, paymentStatus: AppointmentPaymentStatus) =>
    (
      await request<Appointment>(`/appointments/${appointmentId}/payment-status`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus, paymentMethod: 'cash' }),
      })
    ).data,
  assignStaff: async (appointmentId: string, staffId: string) =>
    (
      await request<Appointment>(`/appointments/${appointmentId}/assign-staff`, {
        method: 'PATCH',
        body: JSON.stringify({ staffId }),
      })
    ).data,
  cancel: async (appointmentId: string, cancelReason?: string) =>
    (
      await request<Appointment>(`/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ cancelReason: cancelReason?.trim() || undefined }),
      })
    ).data,
};

export const loyaltyApi = {
  getMyAccount: async () => (await request<LoyaltyAccount>('/loyalty/me')).data,
  getMyTransactions: async () =>
    (await request<LoyaltyTransaction[]>('/loyalty/me/transactions?limit=100')).data,
  getTiers: async () => (await request<MembershipTier[]>('/membership-tiers')).data,
  getRewards: async () => (await request<Reward[]>('/rewards?limit=100')).data,
  getMyRedemptions: async () =>
    (await request<RewardRedemption[]>('/rewards/me/redemptions?limit=100')).data,
  redeem: async (rewardId: string) =>
    (
      await request<{ redemption: RewardRedemption }>(`/rewards/${rewardId}/redeem`, {
        method: 'POST',
      })
    ).data.redemption,
};

export const promotionsApi = {
  listActive: async () => unwrapList<Promotion>('/promotions/active?limit=100'),
  getById: async (promotionId: string) =>
    (await request<Promotion>(`/promotions/${promotionId}`)).data,
};

export const serviceHistoriesApi = {
  listMine: async (vehicleId?: string) => {
    const path = vehicleId
      ? `/service-histories/my/vehicles/${vehicleId}?limit=100`
      : '/service-histories/my?limit=100';
    return (await request<ServiceHistory[]>(path)).data;
  },
  getMineById: async (serviceHistoryId: string) =>
    (await request<ServiceHistory>(`/service-histories/my/${serviceHistoryId}`)).data,
};

export const notificationsApi = {
  listMy: async () => {
    try {
      return await unwrapList<NotificationItem>('/notifications/me?limit=100');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return [];
      throw error;
    }
  },
  getUnreadCount: async () => {
    try {
      return (await request<{ unreadCount: number }>('/notifications/me/unread-count')).data.unreadCount;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return 0;
      throw error;
    }
  },
  markRead: async (notificationId: string) =>
    (await request<NotificationItem>(`/notifications/${notificationId}/read`, { method: 'PATCH' })).data,
  markAllRead: async () =>
    (await request<{ modifiedCount: number }>('/notifications/me/read-all', { method: 'PATCH' })).data,
};

export const dashboardApi = {
  getOverview: async () => (await request<DashboardOverview>('/dashboard/overview')).data,
};
