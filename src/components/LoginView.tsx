import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PhoneCall,
  Briefcase,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginView: React.FC = () => {
  const { login, resetPassword, securityConfig, directLogin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetMethod, setResetMethod] = useState<'key' | 'question'>('key');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Reset form state
  const [recoveryKey, setRecoveryKey] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!identifier.trim()) {
      setLoginError('Please enter your email or username.');
      return;
    }
    if (!password) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsLoggingIn(true);
    const result = await login(identifier, password);
    setIsLoggingIn(false);

    if (!result.success) {
      setLoginError(result.error || 'Invalid credentials. Please try again.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (resetMethod === 'key' && !recoveryKey.trim()) {
      setResetError('Please enter the office master recovery key.');
      return;
    }
    if (resetMethod === 'question' && !securityAnswer.trim()) {
      setResetError('Please provide the answer to the security question.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setResetError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('New password and confirm password do not match.');
      return;
    }

    setIsResetting(true);
    const result = await resetPassword({
      recoveryKey: resetMethod === 'key' ? recoveryKey.trim() : undefined,
      securityAnswer: resetMethod === 'question' ? securityAnswer.trim() : undefined,
      newPassword: newPassword.trim(),
    });
    setIsResetting(false);

    if (!result.success) {
      setResetError(result.error || 'Failed to reset password. Please check your verification key/answer.');
    } else {
      setResetSuccess(result.message || 'Password successfully updated! You are now authenticated.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8 transition-colors relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          id="login-theme-toggle"
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-amber-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Icon & Heading */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/60 mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Galaxy Consultancy
          </h2>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-widest mt-1">
            Loan Consultant CRM • Private Office Access
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Confidential Customer Records, Bank Commission Calculations & Loan Calling Radar
          </p>
        </div>

        {/* Card Container */}
        <div className="mt-6 bg-white dark:bg-slate-900 py-7 px-6 sm:px-8 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Secure Office Login</span>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Password Protected
                </span>
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Username / Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or username"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Office Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setResetError(null);
                      setResetSuccess(null);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Forgot / Reset?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoggingIn ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Unlock Office Portal</span>
                  </>
                )}
              </button>

              {/* Direct 1-Click Access */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="direct-enter-btn"
                  type="button"
                  onClick={directLogin}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Enter Dashboard Directly</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= RESET PASSWORD FORM ================= */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Reset Password
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Verify your identity using your master recovery key or your security question to set a new password.
              </p>

              {resetError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {/* Verification Method Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetMethod('key')}
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    resetMethod === 'key'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Master Recovery Key</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetMethod('question')}
                  className={`flex-1 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    resetMethod === 'question'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Security Question</span>
                </button>
              </div>

              {/* Reset via Master Key */}
              {resetMethod === 'key' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Master Recovery Key
                  </label>
                  <input
                    id="recovery-key-input"
                    type="text"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="Enter your recovery key"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter the office recovery key configured in your security settings.
                  </p>
                </div>
              ) : (
                /* Reset via Security Question */
                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      Security Question:
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {securityConfig?.securityQuestion ||
                        'What is the name of your loan consultancy office?'}
                    </p>
                  </div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Your Secret Answer
                  </label>
                  <input
                    id="security-answer-input"
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter secret answer"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Set New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full pl-3 pr-10 py-2 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Submit Reset */}
              <button
                id="reset-submit-btn"
                type="submit"
                disabled={isResetting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isResetting ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Set New Password & Log In</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security & Privacy Notice Footer */}
        <div className="mt-5 text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Encrypted local session storage on this device</span>
          </p>
          <p>
            Bank partner payouts, borrower PAN & loan agreements remain strictly private.
          </p>
        </div>
      </div>
    </div>
  );
};
