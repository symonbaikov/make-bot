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
        throw new Error('Backend API is not available. Please try again later.');
      }

      throw new Error('Failed to send data to backend. Please try again.');
    }
  }

  /**
   * Check if backend API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
