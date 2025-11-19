import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginCredentials } from '../types';
import { apiService } from '../services/api';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../utils/sentry';

interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithResetCode: (email: string, code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUser(user);
        // Set user in Sentry
        setSentryUser({
          id: user.id,
          email: user.email,
          username: user.email,
        });
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await apiService.login(credentials);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    setUser(response.user);
    // Set user in Sentry
    setSentryUser({
      id: response.user.id,
      email: response.user.email,
      username: response.user.email,
    });
  };

  const loginWithResetCode = async (email: string, code: string) => {
    const response = await apiService.loginWithResetCode(email, code);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    setUser(response.user);
    // Set user in Sentry
    setSentryUser({
      id: response.user.id,
      email: response.user.email,
      username: response.user.email,
    });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    // Clear user in Sentry
    clearSentryUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithResetCode,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
