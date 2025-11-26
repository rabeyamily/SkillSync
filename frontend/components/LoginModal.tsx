"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Logo from './Logo';
import { login, signup, googleAuth, verifyEmail, resendVerificationCode } from '@/services/api';
import { GoogleLogin } from '@react-oauth/google';
import { validatePassword, getPasswordRequirements, type PasswordValidationResult } from '@/utils/passwordValidation';

export default function LoginModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (!isLogin && newPassword.length > 0) {
      const validation = validatePassword(newPassword, {
        email: email,
        fullName: undefined
      });
      setPasswordValidation(validation);
      // Auto-show requirements if password is invalid
      if (!validation.isValid && !showPasswordRequirements) {
        setShowPasswordRequirements(true);
      }
    } else {
      setPasswordValidation(null);
      setShowPasswordRequirements(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password for signup
    if (!isLogin) {
      const validation = validatePassword(password, {
        email: email,
        fullName: undefined
      });
      
      if (!validation.isValid) {
        setError(validation.errors[0] || 'Password does not meet requirements');
        setShowPasswordRequirements(true);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        // Success - notify parent and close modal
        setLoading(false);
        onSuccess?.();
        onClose();
      } else {
        // Signup - show verification screen
        const result = await signup(email, password);
        if (result.requires_verification) {
          setPendingEmail(email);
          setShowVerification(true);
          setLoading(false);
        } else {
          // If no verification needed (shouldn't happen with new flow)
          setLoading(false);
          onSuccess?.();
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Login/Signup error:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error response status:', err.response?.status);
      console.error('Error response headers:', err.response?.headers);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'An error occurred. Please try again.';
      
      // Check for detailed error message from backend
      // FastAPI returns errors in response.data.detail
      if (err.response?.data?.detail) {
        // Handle both string and array of errors
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((e: any) => e.msg || e).join(', ');
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check if the backend server is running.';
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running at http://localhost:8000';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError('');
      
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      
      await googleAuth(credentialResponse.credential);
      
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Google auth error:', err);
      const errorMessage = err.response?.data?.detail 
        || err.message 
        || (err.code === 'ECONNABORTED' ? 'Request timed out. Please check if the backend server is running.' 
        : err.code === 'ERR_NETWORK' ? 'Cannot connect to server. Please check if the backend is running at http://localhost:8000'
        : 'Failed to sign in with Google. Please try again.');
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Failed to sign in with Google. Please try again.');
    setLoading(false);
  };

  const handleGuestMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_mode', 'true');
    }
    onClose();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyEmail(pendingEmail, verificationCode);
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      let errorMessage = 'Invalid verification code. Please try again.';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await resendVerificationCode(pendingEmail);
      setError('');
      alert('Verification code has been resent to your email.');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to resend code. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    setIsLogin(true);
    setShowPassword(false);
    setPasswordValidation(null);
    setShowPasswordRequirements(false);
    setShowVerification(false);
    setVerificationCode('');
    setPendingEmail('');
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity z-[9998]"
        onClick={handleClose}
      ></div>

      {/* Modal Container */}
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal */}
          <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-md">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 z-10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="px-8 py-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <Logo />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Verification Code Screen */}
              {showVerification ? (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Verify Your Email
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We've sent a verification code to <strong>{pendingEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Verification Code
                    </label>
                    <input
                      id="verification-code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors px-3 py-2.5 text-center text-2xl tracking-widest"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={loading}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                      Resend verification code
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowVerification(false);
                        setVerificationCode('');
                        setPendingEmail('');
                        setError('');
                      }}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Back to sign up
                    </button>
                  </div>
                </form>
              ) : (
                /* Single Column Form - LinkedIn Style */
                <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors px-3 py-2.5"
                    placeholder=""
                    autoFocus
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      required
                      minLength={isLogin ? 6 : 12}
                      maxLength={64}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors px-3 py-2.5 pr-16"
                      placeholder=""
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator - only for signup */}
                  {!isLogin && password.length > 0 && passwordValidation && (
                    <div className="mt-2 space-y-2">
                      {!passwordValidation.isValid && passwordValidation.errors.length > 0 && (
                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Password does not meet requirements:</p>
                          <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                            {passwordValidation.errors.map((err, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{err}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={loading || !email || !password || (!isLogin && passwordValidation !== null && !passwordValidation.isValid)}
                  className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Join'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      or
                    </span>
                  </div>
                </div>

                {/* Google Sign In Button */}
                <div className="w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    locale="en"
                  />
                </div>

                {/* Sign in/Sign up Link */}
                <div className="text-center pt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isLogin ? "Don't have an account? " : 'Already on SkillSync? '}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setPassword('');
                      setPasswordValidation(null);
                      setShowPasswordRequirements(false);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
