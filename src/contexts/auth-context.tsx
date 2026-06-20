import { router } from 'expo-router';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { ApiError, authApi } from '@/lib/api';
import { tokenStorage } from '@/lib/storage';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isBootstrapping: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (input: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: User) => void;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const clearSession = useCallback(async () => {
    await tokenStorage.remove();
    setToken(null);
    setUser(null);
  }, []);

  const validateSession = useCallback(async () => {
    const savedToken = await tokenStorage.get();
    if (!savedToken) {
      await clearSession();
      return false;
    }

    try {
      const currentUser = await authApi.me(savedToken ?? undefined);
      setToken(await tokenStorage.get());
      setUser(currentUser);
      return true;
    } catch {
      await clearSession();
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    const task = Promise.resolve()
      .then(() => validateSession())
      .finally(() => setIsBootstrapping(false));
    return () => {
      void task;
    };
  }, [validateSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !isBootstrapping) {
        validateSession();
      }
    });
    return () => subscription.remove();
  }, [isBootstrapping, validateSession]);

  const signIn = useCallback(async (phone: string, password: string) => {
    const session = await authApi.signIn(phone, password);
    await tokenStorage.set(session.accessToken);
    setToken(session.accessToken);
    setUser(session.user);
  }, []);

  const signUp = useCallback(
    async (input: { phone: string; password: string; firstName: string; lastName: string }) => {
      await authApi.signUp(input);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    await clearSession();
    router.replace('/login');
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isBootstrapping,
      signIn,
      signUp,
      signOut,
      updateUser: setUser,
      validateSession,
    }),
    [isBootstrapping, signIn, signOut, signUp, token, user, validateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export function getApiErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}
