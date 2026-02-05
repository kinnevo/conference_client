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

export interface Prompt {
  id: string;
  name: string;
  content: string;
  description: string | null;
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

export interface LLMProvider {
  id: string;
  name: 'openai' | 'groq' | 'anthropic' | 'google';
  display_name: string;
  is_enabled: boolean;
  is_active: boolean;
  api_key_encrypted?: string;
  api_key_iv?: string;
  api_key_masked?: string; // e.g., "sk-...****"
  base_url?: string;
  model: string;
  max_tokens: number;
  temperature: number;
  settings?: any;
  last_test_at?: string;
  last_test_status?: 'success' | 'failed' | 'pending';
  last_test_error?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMProviderConfig {
  api_key: string;
  model: string;
  max_tokens?: number;
  temperature?: number;
  base_url?: string;
}

export interface LLMTestResult {
  success: boolean;
  message: string;
  response_time_ms?: number;
  error?: string;
}

// Signal Validator types
export type QualificationLevel = 'valid' | 'weak' | 'not-a-signal';

export interface ValidationResult {
  originalInput: string;
  outcome: QualificationLevel;
  reasoning: string[];
  signalTypes: string[];
  clarification: string;
  metrics: string[];
  improvements: string[];
  improvedVersion: string;
  rawResponse: string;
}

export interface SignalCard {
  id: string;
  title: string;
  description: string;
  fieldOfInterest: string;
  userId: string;
  qualificationLevel: QualificationLevel;
  validationResult: ValidationResult | null;
  createdAt: Date;
}
