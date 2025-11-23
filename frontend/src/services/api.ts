import axios, { AxiosError } from 'axios';
import {
  ApiResponse,
  LoginCredentials,
  LoginResponse,
  Session,
  PaginatedResponse,
  ListSessionsParams,
  Action,
  ListActionsParams,
  Stats,
  CreateSessionInput,
} from '../types';

// Use relative path in development (via Vite proxy) or absolute URL in production
// In dev mode, ALWAYS use empty string to use Vite proxy (ignore VITE_API_URL in dev)
// In production, use relative path (nginx proxy) or VITE_API_URL if set
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
// In production Docker, nginx proxies /api to backend, so use empty string (relative path)
const API_URL = isDev
  ? '' // Always use Vite proxy in dev mode
  : import.meta.env.VITE_API_URL || ''; // Use relative path in production (nginx proxy)

// Log API URL for debugging
if (isDev) {
  console.log('API URL:', API_URL || '(using Vite proxy)');
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  response => response,
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
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/api/admin/auth/login',
        credentials
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Login failed');
      }
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;
        const errorMessage =
          axiosError.response?.data?.error?.message || axiosError.message || 'Login failed';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>(
        '/api/admin/auth/forgot-password',
        { email }
      );
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to request password reset');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;
        const errorMessage =
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          'Failed to request password reset';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  async loginWithResetCode(email: string, code: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/api/admin/auth/reset-password',
        { email, code }
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Invalid or expired code');
      }
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;
        const errorMessage =
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          'Invalid or expired code';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  // Profile Management
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>(
        '/api/admin/profile/change-password',
        { oldPassword, newPassword }
      );
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to change password');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;
        const errorMessage =
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          'Failed to change password';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  async changeEmail(newEmail: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/api/admin/profile/change-email',
        { newEmail, password }
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to change email');
      }
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiResponse>;
        const errorMessage =
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          'Failed to change email';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  // Sessions/Payments
  async getSessions(params: ListSessionsParams = {}): Promise<PaginatedResponse<Session>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Session>>>('/api/admin/payments', {
      params,
    });
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
    const response = await api.put<ApiResponse<Session>>(`/api/admin/payments/${id}/email`, {
      email,
    });
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

  async sendEmail(id: string, subject: string, body: string): Promise<void> {
    const response = await api.post<ApiResponse>(`/api/admin/payments/${id}/send-email`, {
      subject,
      body,
    });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to send email');
    }
  },

  async createSession(data: CreateSessionInput): Promise<Session & { botLink: string }> {
    const response = await api.post<ApiResponse<Session & { botLink: string }>>(
      '/api/admin/sessions',
      data
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to create session');
    }
    return response.data.data;
  },

  // Actions
  async getActions(params: ListActionsParams = {}): Promise<PaginatedResponse<Action>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Action>>>('/api/admin/actions', {
      params,
    });
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

  async downloadExport(params: {
    startDate?: string;
    endDate?: string;
    status?: string;
    plan?: string;
    format?: 'csv' | 'excel' | 'pdf' | 'docx';
  }): Promise<Blob> {
    // Set appropriate Accept header based on format
    let acceptHeader = 'text/csv';
    if (params.format === 'pdf') {
      acceptHeader = 'application/pdf';
    } else if (params.format === 'docx') {
      acceptHeader = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const response = await api.get<Blob>('/api/admin/export', {
      params,
      responseType: 'blob',
      headers: {
        Accept: acceptHeader,
      },
    });

    return response.data;
  },
};

export default api;
