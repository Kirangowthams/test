import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
    mobile?: string;
    email?: string;
    recoveryKey?: string;
    securityAnswer?: string;
    newPassword: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateSecurityProfile: (payload: {
    name?: string;
    email?: string;
    phone?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    recoveryKey?: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'loan_office_auth_session_v1';
const LOCAL_CREDS_KEY = 'galaxy_local_auth_creds_v1';

interface LocalCredentials {
  password: string;
  recoveryKey: string;
  securityQuestion: string;
  securityAnswer: string;
  email: string;
  phone: string;
  name: string;
}

const DEFAULT_CREDS: LocalCredentials = {
  password: 'password123',
  recoveryKey: 'selvammanju9898',
  securityQuestion: 'What is the name of your loan consultancy office?',
  securityAnswer: 'Galaxy Consultancy',
  email: 'skg462003@gmail.com',
  phone: '9585022822',
  name: 'Galaxy Consultancy',
};

function getStoredCredentials(): LocalCredentials {
  try {
    const raw = localStorage.getItem(LOCAL_CREDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.password === 'string') {
        const merged = { ...DEFAULT_CREDS, ...parsed };
        if (merged.recoveryKey === 'GALAXY-SECURE-2025' || !merged.recoveryKey) {
          merged.recoveryKey = 'selvammanju9898';
          saveStoredCredentials(merged);
        }
        return merged;
      }
    }
  } catch (e) {
    console.error('Failed to read local credentials:', e);
  }
  return DEFAULT_CREDS;
}

function saveStoredCredentials(creds: LocalCredentials) {
  try {
    localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(creds));
  } catch (e) {
    console.error('Failed to save local credentials:', e);
  }
}

async function syncCredentialsToFirestore(creds: LocalCredentials) {
  try {
    const docRef = doc(db, 'settings', 'auth');
    await setDoc(
      docRef,
      {
        ...creds,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Could not sync credentials to Firestore:', e);
  }
}

async function safeFetchJson<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(() => {
    const creds = getStoredCredentials();
    return {
      email: creds.email,
      name: creds.name,
      securityQuestion: creds.securityQuestion,
      recoveryKeyHint: `${creds.recoveryKey.slice(0, 4)}****`,
    };
  });

  // Load existing session and sync cloud credentials on initial render
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

    // Pull latest credentials from Firestore so all devices stay updated
    const loadCloudCredentials = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'auth'));
        if (snap.exists()) {
          const cloudData = snap.data() as Partial<LocalCredentials>;
          if (cloudData && typeof cloudData.password === 'string') {
            const merged = { ...getStoredCredentials(), ...cloudData };
            saveStoredCredentials(merged);
            setSecurityConfig({
              email: merged.email,
              phone: merged.phone,
              name: merged.name,
              securityQuestion: merged.securityQuestion,
              recoveryKeyHint: `${merged.recoveryKey.slice(0, 4)}****`,
            });
          }
        }
      } catch (err) {
        console.warn('Could not load credentials from Firestore:', err);
      }
    };

    loadCloudCredentials();
  }, []);

  // Fetch public security config (for reset password hints)
  const fetchSecurityConfig = async () => {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        const data = await safeFetchJson<SecurityConfig>(res);
        if (data) {
          setSecurityConfig(data);
          return;
        }
      }
    } catch {
      // Backend not running or static host
    }

    // Fallback to stored local credentials
    const creds = getStoredCredentials();
    setSecurityConfig({
      email: creds.email,
      phone: creds.phone || '9585022822',
      name: creds.name,
      securityQuestion: creds.securityQuestion,
      recoveryKeyHint: `${creds.recoveryKey.slice(0, 4)}****`,
    });
  };

  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both your email/username and password.' };
    }

    // 1. Try backend server if available
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
      });

      const data = await safeFetchJson(res);
      if (data && typeof data === 'object') {
        if (res.ok && data.success) {
          const newSession: AuthSession = {
            user: data.user,
            token: data.token,
            loginTime: data.loginTime || new Date().toISOString(),
          };

          setSession(newSession);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
          return { success: true };
        }
      }
    } catch {
      // Backend unreachable or returned empty/non-JSON response (e.g. Netlify static hosting)
    }

    // 2. Fallback: Authenticate client-side against persistent local credentials
    const creds = getStoredCredentials();
    const storedEmail = (creds.email || '').toLowerCase().trim();
    const storedName = (creds.name || '').toLowerCase().trim();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const storedPhoneDigits = (creds.phone || '9585022822').replace(/\D/g, '');

    const isMatchMobile = cleanDigits === '9585022822' || (cleanDigits.length >= 10 && cleanDigits === storedPhoneDigits);

    const allowedUsers = [
      storedEmail,
      storedName,
      'dad@loanoffice.com',
      'skg462003@gmail.com',
      'galaxy consultancy',
      'galaxyconsultancy',
      'galaxyconsultancee',
      'galaxy',
      'admin',
      'dad',
      'sharma',
    ].filter(Boolean);

    // Accept registered emails, usernames, mobile numbers, or any identifier formatted with @ if the password is correct
    const isMatchUser =
      isMatchMobile ||
      allowedUsers.includes(cleanId) ||
      cleanId.includes('galaxy') ||
      cleanId.includes('dad') ||
      cleanId.includes('admin') ||
      cleanId.includes('@');

    // Password matches stored password strictly
    const isMatchPass = cleanPass === creds.password;

    if (isMatchUser && isMatchPass) {
      const localToken = 'sess_local_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const newSession: AuthSession = {
        user: {
          id: 'user-office-admin',
          name: creds.name || 'Galaxy Consultancy',
          email: cleanId.includes('@') ? cleanId : (creds.email || 'skg462003@gmail.com'),
          phone: creds.phone || '9585022822',
          role: 'admin',
        },
        token: localToken,
        loginTime: new Date().toISOString(),
      };

      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      return { success: true };
    }

    if (!isMatchPass) {
      return {
        success: false,
        error: 'Incorrect password. Please enter the valid password or use "Forgot / Reset?".',
      };
    }

    return {
      success: false,
      error: 'Invalid credentials. Please verify your email/mobile and password.',
    };
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    const creds = getStoredCredentials();

    if (String(payload.newPassword).trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    // Try backend first
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await safeFetchJson(res);
      if (data && typeof data === 'object') {
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to change password.' };
        }
        // Also update local copy and Firestore
        const updatedCreds = { ...creds, password: String(payload.newPassword).trim() };
        saveStoredCredentials(updatedCreds);
        syncCredentialsToFirestore(updatedCreds);
        return { success: true, message: data.message || 'Password updated successfully.' };
      }
    } catch {
      // Backend not available, handle locally
    }

    // Local change password validation
    if (String(payload.currentPassword).trim() !== creds.password) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const updatedCreds = { ...creds, password: String(payload.newPassword).trim() };
    saveStoredCredentials(updatedCreds);
    syncCredentialsToFirestore(updatedCreds);
    return { success: true, message: 'Password has been updated successfully.' };
  };

  const resetPassword = async (payload: {
    mobile?: string;
    email?: string;
    recoveryKey?: string;
    securityAnswer?: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    const creds = getStoredCredentials();

    if (!payload.newPassword || String(payload.newPassword).trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    // Try backend first
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await safeFetchJson(res);
      if (res.ok && data && typeof data === 'object' && data.success) {
        if (data.user && data.token) {
          const newSession: AuthSession = {
            user: data.user,
            token: data.token,
            loginTime: data.loginTime || new Date().toISOString(),
          };
          setSession(newSession);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        }

        const updatedCreds = { ...creds, password: String(payload.newPassword).trim() };
        saveStoredCredentials(updatedCreds);
        syncCredentialsToFirestore(updatedCreds);
        return { success: true, message: data.message || 'Password successfully reset!' };
      }
    } catch {
      // Backend not available, handle locally
    }

    // Local reset validation
    let verified = false;

    // Security: Only someone possessing the confidential Master Recovery Key or Secret Security Answer can reset
    if (
      payload.recoveryKey &&
      (payload.recoveryKey.trim().toLowerCase() === creds.recoveryKey.toLowerCase() ||
        payload.recoveryKey.trim().toLowerCase() === 'selvammanju9898'.toLowerCase())
    ) {
      verified = true;
    } else if (payload.securityAnswer) {
      const cleanAnswer = payload.securityAnswer.trim().toLowerCase();
      const storedAnswer = creds.securityAnswer.trim().toLowerCase();
      if (
        cleanAnswer &&
        (cleanAnswer === storedAnswer ||
          cleanAnswer === 'galaxy consultancee' ||
          cleanAnswer === 'galaxy consultancy' ||
          cleanAnswer === 'galaxyconsultancee' ||
          cleanAnswer === 'galaxyconsultancy' ||
          cleanAnswer === 'galaxy')
      ) {
        verified = true;
      }
    }

    if (!verified) {
      return {
        success: false,
        error: 'Access Denied: Verification failed. You must provide either the confidential Master Recovery Key or the correct Secret Security Answer to reset the office password.',
      };
    }

    const updatedCreds = { ...creds, password: String(payload.newPassword).trim() };
    saveStoredCredentials(updatedCreds);
    syncCredentialsToFirestore(updatedCreds);

    const localToken = 'sess_local_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const newSession: AuthSession = {
      user: {
        id: 'user-office-admin',
        name: updatedCreds.name,
        email: updatedCreds.email,
        phone: updatedCreds.phone,
        role: 'admin',
      },
      token: localToken,
      loginTime: new Date().toISOString(),
    };
    setSession(newSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));

    return {
      success: true,
      message: 'Password successfully reset! You are now logged into your office portal.',
    };
  };

  const updateSecurityProfile = async (payload: {
    name?: string;
    email?: string;
    phone?: string;
    securityQuestion?: string;
    securityAnswer?: string;
    recoveryKey?: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    const creds = getStoredCredentials();
    const updatedCreds: LocalCredentials = {
      ...creds,
      name: payload.name ? payload.name.trim() : creds.name,
      email: payload.email ? payload.email.trim() : creds.email,
      phone: payload.phone ? payload.phone.trim() : creds.phone,
      securityQuestion: payload.securityQuestion ? payload.securityQuestion.trim() : creds.securityQuestion,
      securityAnswer: payload.securityAnswer ? payload.securityAnswer.trim() : creds.securityAnswer,
      recoveryKey: payload.recoveryKey ? payload.recoveryKey.trim() : creds.recoveryKey,
    };

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await safeFetchJson(res);
      if (data && typeof data === 'object') {
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to update security profile.' };
        }
        if (data.config) {
          setSecurityConfig(data.config);
        }
      }
    } catch {
      // Backend not running, handled locally below
    }

    saveStoredCredentials(updatedCreds);
    syncCredentialsToFirestore(updatedCreds);
    setSecurityConfig({
      email: updatedCreds.email,
      name: updatedCreds.name,
      securityQuestion: updatedCreds.securityQuestion,
      recoveryKeyHint: `${updatedCreds.recoveryKey.slice(0, 4)}****`,
    });

    if (session && payload.name) {
      const updatedSession = { ...session, user: { ...session.user, name: payload.name } };
      setSession(updatedSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
    }

    return { success: true, message: 'Security settings updated successfully!' };
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
