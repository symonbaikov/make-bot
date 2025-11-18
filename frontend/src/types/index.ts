// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RequestPasswordResetCredentials {
  email: string;
}

export interface LoginWithResetCodeCredentials {
  email: string;
  code: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER';
  firstName?: string;
  lastName?: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

// Session/Payment types
export type Plan = 'BASIC' | 'STANDARD' | 'PREMIUM';
export const PlanValues: Plan[] = ['BASIC', 'STANDARD', 'PREMIUM'];

export type SessionStatus = 
  | 'STARTED' 
  | 'AWAITING_PAYMENT' 
  | 'PAID' 
  | 'PAID_PENDING_EMAIL' 
  | 'COMPLETED' 
  | 'REFUNDED' 
  | 'FAILED';

export const SessionStatusValues: SessionStatus[] = [
  'STARTED',
  'AWAITING_PAYMENT',
  'PAID',
  'PAID_PENDING_EMAIL',
  'COMPLETED',
  'REFUNDED',
  'FAILED',
];

export interface Session {
  id: string;
  sessionId: string;
  txnId?: string;
  plan: Plan;
  emailUser?: string;
  emailPaypal?: string;
  finalEmail?: string;
  amount: number;
  currency: string;
  status: SessionStatus;
  paymentDate?: string;
  endDate?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListSessionsParams {
  page?: number;
  limit?: number;
  status?: SessionStatus;
  plan?: Plan;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Action types
export type ActionType =
  | 'SESSION_CREATED'
  | 'EMAIL_COLLECTED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_VERIFIED'
  | 'ACCESS_GRANTED'
  | 'EMAIL_RESENT'
  | 'EMAIL_UPDATED'
  | 'ACCESS_MANUALLY_GRANTED'
  | 'WEBHOOK_SENT'
  | 'WEBHOOK_FAILED';

export const ActionTypeValues: ActionType[] = [
  'SESSION_CREATED',
  'EMAIL_COLLECTED',
  'PAYMENT_RECEIVED',
  'PAYMENT_VERIFIED',
  'ACCESS_GRANTED',
  'EMAIL_RESENT',
  'EMAIL_UPDATED',
  'ACCESS_MANUALLY_GRANTED',
  'WEBHOOK_SENT',
  'WEBHOOK_FAILED',
];

export interface Action {
  id: string;
  type: ActionType;
  ref?: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  createdAt: string;
  session?: {
    id: string;
    sessionId: string;
    plan: Plan;
    status: SessionStatus;
  };
}

export interface ListActionsParams {
  page?: number;
  limit?: number;
  type?: ActionType;
  ref?: string;
  startDate?: string;
  endDate?: string;
}

// Stats types
export interface Stats {
  totalSessions: number;
  totalRevenue: number;
  conversionRate: number;
  revenueByPlan: {
    plan: Plan;
    count: number;
    revenue: number;
  }[];
  conversionFunnel: {
    started: number;
    awaitingPayment: number;
    paid: number;
    completed: number;
  };
  trends: {
    date: string;
    sessions: number;
    revenue: number;
  }[];
}

// Create session
export interface CreateSessionInput {
  plan: Plan;
  amount: number;
  currency?: string;
}

