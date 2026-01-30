'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { User, RegisterData, LoginData } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = Cookies.get('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
      connectSocket();
    } catch {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(loginData: LoginData) {
    const { data } = await api.post('/api/auth/login', loginData);

    Cookies.set('accessToken', data.accessToken, { expires: 1/96 }); // 15 min
    Cookies.set('refreshToken', data.refreshToken, { expires: 7 }); // 7 days

    setUser(data.user);
    connectSocket();
    router.push('/select-area');
  }

  async function register(registerData: RegisterData) {
    await api.post('/api/auth/register', registerData);
    router.push('/register/success');
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout', {
        refreshToken: Cookies.get('refreshToken')
      });
    } finally {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      setUser(null);
      disconnectSocket();
      router.push('/');
    }
  }

  async function refetchUser() {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
    } catch (error) {
      console.error('Failed to refetch user:', error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
