import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, SecurityConfig, UserAccount } from '../types';

interface AuthContextType {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  securityConfig: SecurityConfig | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (payload: {
    recoveryKey?: string;
    securityAnswer?: string;
    newPassword: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateSecurityProfile: (payload: {
    name?: string;
    email?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    recoveryKey?: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'loan_office_auth_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null);

  // Load existing session on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthSession;
        if (parsed && parsed.user && parsed.token) {
          setSession(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load local auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch public security config (for reset password hints)
  const fetchSecurityConfig = async () => {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        const data = await res.json();
        setSecurityConfig(data);
      }
    } catch (e) {
      console.error('Failed to fetch security config:', e);
    }
  };

  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Login failed. Please check credentials.' };
      }

      const newSession: AuthSession = {
        user: data.user,
        token: data.token,
        loginTime: data.loginTime || new Date().toISOString(),
      };

      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unable to connect to authentication server.' };
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to change password.' };
      }

      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server connection error.' };
    }
  };

  const resetPassword = async (payload: {
    recoveryKey?: string;
    securityAnswer?: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Password reset failed.' };
      }

      if (data.user && data.token) {
        const newSession: AuthSession = {
          user: data.user,
          token: data.token,
          loginTime: data.loginTime || new Date().toISOString(),
        };
        setSession(newSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      }

      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server connection error during password reset.' };
    }
  };

  const updateSecurityProfile = async (payload: {
    name?: string;
    email?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    recoveryKey?: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update security profile.' };
      }

      if (data.config) {
        setSecurityConfig(data.config);
      }
      if (session && payload.name) {
        const updatedSession = { ...session, user: { ...session.user, name: payload.name } };
        setSession(updatedSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
      }

      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        isLoading,
        securityConfig,
        login,
        logout,
        changePassword,
        resetPassword,
        updateSecurityProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
