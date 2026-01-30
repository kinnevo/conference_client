export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  attendeeType: 'general' | 'speaker' | 'sponsor' | 'vip';
  isAdmin: boolean;
}

export interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  attendeeType: 'general' | 'speaker' | 'sponsor' | 'vip';
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  attendeeType: 'general' | 'speaker' | 'sponsor' | 'vip';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ProfileStats {
  total: number;
  byType: Record<string, number>;
  admins: number;
}
