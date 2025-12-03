export interface BotConfig {
  apiUrl: string;
  paypalClientId: string;
  paypalMode: 'sandbox' | 'live';
  botUsername: string;
}

export interface SessionData {
  sessionId: string;
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM';
  amount: number;
  currency?: string;
}

export interface UserData {
  tgUserId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface BotWebhookPayload {
  sessionId: string;
  email: string;
  tgUserId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM';
  amount: number;
  currency?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface SessionStatus {
  sessionId: string;
  status: string;
  message?: string;
}
