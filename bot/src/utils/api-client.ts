import axios, { AxiosError } from 'axios';
import { BotWebhookPayload, ApiResponse, SessionStatus } from '../types';

const API_URL = process.env.API_URL || 'http://localhost:3000';

export interface SessionInfo {
  id: string;
  sessionId: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  emailUser?: string;
  emailPaypal?: string;
  finalEmail?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get session information by sessionId
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    try {
      const response = await axios.get<ApiResponse<SessionInfo>>(
        `${this.baseUrl}/api/admin/payments/${sessionId}`,
        {
          timeout: 5000,
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data as SessionInfo;
      }

      return null;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      
      if (axiosError.response?.status === 404) {
        return null;
      }

      // Log error but don't throw - session might not exist yet
      return null;
    }
  }

  /**
   * Send email collection data to backend
   */
  async sendBotWebhook(payload: BotWebhookPayload): Promise<SessionStatus> {
    try {
      const response = await axios.post<ApiResponse<SessionStatus>>(
        `${this.baseUrl}/api/webhook/bot`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Unknown error');
      }

      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      
      if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error.message);
      }

      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error('Бэкенд API недоступний. Будь ласка, спробуйте пізніше.');
      }

      throw new Error('Не вдалося відправити дані в бэкенд. Будь ласка, спробуйте ще раз.');
    }
  }

  /**
   * Check if backend API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const healthUrl = `${this.baseUrl}/health`;
      const response = await axios.get(healthUrl, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      // Log error details for debugging
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        // Connection failed - backend might be down or URL is wrong
        return false;
      }
      // Other errors (like 404) also mean backend is not available
      return false;
    }
  }
}

export const apiClient = new ApiClient();
