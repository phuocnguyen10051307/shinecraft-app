import { Platform } from 'react-native';

import { tokenStorage } from '@/lib/storage';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  LoyaltyAccount,
  LoyaltyTransaction,
  MembershipTier,
  Reward,
  RewardRedemption,
  Service,
  ServiceHistory,
  User,
  Vehicle,
  VehicleInput,
} from '@/types';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? `http://${fallbackHost}:3000/api`;
const REQUEST_TIMEOUT_MS = 10_000;

interface ApiEnvelope<T> {
  data: T;
  message?: string;
  pagination?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
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
      throw new ApiError(payload.message || 'Không thể kết nối đến máy chủ.', response.status);
    }
    return payload as ApiEnvelope<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
        : `Không thể kết nối đến API tại ${API_URL}.`;
    throw new ApiError(message, 0);
  } finally {
    clearTimeout(timeout);
  }
}

const toVehicleFormData = (input: Partial<VehicleInput>) => {
  const data = new FormData();
  if (input.type !== undefined) data.append('type', input.type);
  if (input.brand !== undefined) data.append('brand', input.brand.trim());
  if (input.model !== undefined) data.append('model', input.model.trim());
  if (input.licensePlate !== undefined) data.append('licensePlate', input.licensePlate.trim());
  if (input.year !== undefined) data.append('year', String(input.year));
  if (input.note !== undefined) data.append('note', input.note.trim());
  return data;
};

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
      // Đăng xuất cục bộ vẫn phải hoàn tất nếu máy chủ không khả dụng.
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

export const servicesApi = {
  listActive: async () => (await request<Service[]>('/services/active?limit=100')).data,
  list: async () => (await request<Service[]>('/services?limit=100')).data,
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
        body: JSON.stringify({ ...input, note: input.note?.trim() || undefined }),
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
  updatePaymentStatus: async (appointmentId: string, paymentStatus: Appointment['paymentStatus']) =>
    (
      await request<Appointment>(`/appointments/${appointmentId}/payment-status`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus }),
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

export const serviceHistoriesApi = {
  list: async (role: User['role']) => {
    const path =
      role === 'admin'
        ? '/service-histories?limit=100'
        : role === 'staff'
          ? '/service-histories/staff/my?limit=100'
          : '/service-histories/my?limit=100';
    return (await request<ServiceHistory[]>(path)).data;
  },
  update: async (id: string, input: { note?: string; nextMaintenanceDate?: string }) =>
    (
      await request<ServiceHistory>(`/service-histories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    ).data,
  remove: async (id: string) => request(`/service-histories/${id}`, { method: 'DELETE' }),
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
