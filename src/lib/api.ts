import { Platform } from 'react-native';

import { tokenStorage } from '@/lib/storage';
import type {
  Appointment,
  CreateAppointmentInput,
  Service,
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
  pagination?: { total?: number };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & {
  token?: string | null;
  skipAuthRefresh?: boolean;
  hasRetried?: boolean;
};

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefresh();
      if (!refreshToken) {
        throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
      }

      const response = await request<{ accessToken: string }>('/auth/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        token: null,
        skipAuthRefresh: true,
      });
      await tokenStorage.set(response.data.accessToken);
      return response.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = options.token === undefined ? await tokenStorage.get() : options.token;
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>>;

    if (!response.ok) {
      if (
        response.status === 401 &&
        options.token !== null &&
        !options.skipAuthRefresh &&
        !options.hasRetried
      ) {
        try {
          const nextToken = await refreshAccessToken();
          return request<T>(path, {
            ...options,
            token: nextToken,
            hasRetried: true,
          });
        } catch {
          await tokenStorage.remove();
        }
      }

      if (response.status === 401 && options.hasRetried) {
        await tokenStorage.remove();
      }
      throw new ApiError(payload.message || 'Không thể kết nối đến máy chủ.', response.status);
    }
    return payload as ApiEnvelope<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
        : `Không thể kết nối đến API tại ${API_URL}.`;
    throw new ApiError(message, 0);
  } finally {
    clearTimeout(timeout);
  }
}

export const authApi = {
  signIn: async (phone: string, password: string) => {
    const response = await request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), password }),
      token: null,
    });
    return response.data;
  },
  signUp: async (input: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const response = await request<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
      token: null,
    });
    return response.data;
  },
  me: async (token?: string) => (await request<User>('/auth/me', { token })).data,
  signOut: async () => {
    const refreshToken = await tokenStorage.getRefresh();
    try {
      await request('/auth/signout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuthRefresh: true,
      });
    } catch {
      // Local sign-out must still complete when the server is unavailable.
    }
  },
};

export const vehiclesApi = {
  list: async (role: User['role']) => {
    const path = role === 'customer' ? '/vehicles/me?limit=100' : '/vehicles?limit=100';
    const response = await request<Vehicle[]>(path);
    return response.data;
  },
  create: async (input: VehicleInput) =>
    (await request<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(input) })).data,
  update: async (id: string, input: VehicleInput) =>
    (
      await request<Vehicle>(`/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
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
};

export const servicesApi = {
  listActive: async () =>
    (await request<Service[]>('/services/active?limit=100')).data,
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
        }),
      })
    ).data,
  cancelMine: async (appointmentId: string, cancelReason?: string) =>
    (
      await request<Appointment>(`/appointments/my/${appointmentId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({
          cancelReason: cancelReason?.trim() || undefined,
        }),
      })
    ).data,
};
