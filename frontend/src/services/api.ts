import axios, { AxiosError } from 'axios';
import { ApiResponse, LoginCredentials, LoginResponse, Session, PaginatedResponse, ListSessionsParams, Action, ListActionsParams, Stats, CreateSessionInput } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/api/admin/auth/login', credentials);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Login failed');
    }
    return response.data.data;
  },

  // Sessions/Payments
  async getSessions(params: ListSessionsParams = {}): Promise<PaginatedResponse<Session>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Session>>>('/api/admin/payments', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch sessions');
    }
    return response.data.data;
  },

  async getSession(id: string): Promise<Session> {
    const response = await api.get<ApiResponse<Session>>(`/api/admin/payments/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch session');
    }
    return response.data.data;
  },

  async updateEmail(id: string, email: string): Promise<Session> {
    const response = await api.put<ApiResponse<Session>>(`/api/admin/payments/${id}/email`, { email });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update email');
    }
    return response.data.data;
  },

  async resendEmail(id: string): Promise<void> {
    const response = await api.post<ApiResponse>(`/api/admin/payments/${id}/resend`);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to resend email');
    }
  },

  async grantAccess(id: string): Promise<Session> {
    const response = await api.post<ApiResponse<Session>>(`/api/admin/payments/${id}/grant-access`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to grant access');
    }
    return response.data.data;
  },

  async createSession(data: CreateSessionInput): Promise<Session & { botLink: string }> {
    const response = await api.post<ApiResponse<Session & { botLink: string }>>('/api/admin/sessions', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create session');
    }
    return response.data.data;
  },

  // Actions
  async getActions(params: ListActionsParams = {}): Promise<PaginatedResponse<Action>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Action>>>('/api/admin/actions', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch actions');
    }
    return response.data.data;
  },

  // Stats
  async getStats(params?: { startDate?: string; endDate?: string }): Promise<Stats> {
    const response = await api.get<ApiResponse<Stats>>('/api/admin/stats', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch stats');
    }
    return response.data.data;
  },
};

export default api;

