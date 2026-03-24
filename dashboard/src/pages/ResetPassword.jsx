import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setError('No reset token provided');
      return;
    }

    try {
      await axios.get(`${API_URL}/api/auth/verify-reset-token`, {
        params: { token }
      });
      setTokenValid(true);
    } catch (err) {
      setError('Reset link is invalid or expired');
      setTokenValid(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError('Both password fields required');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword
      });

      setMessage('✅ Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🎤 Internal Bot Platform</h1>
          <p className="subtitle">Verifying reset link...</p>
          <p style={{ textAlign: 'center', color: '#666' }}>Please wait...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🎤 Internal Bot Platform</h1>
          <p className="subtitle">Reset Link Invalid</p>
          <div className="error-message">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="login-button"
            style={{ marginTop: '20px' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🎤 Reset Password</h1>
        <p className="subtitle">Enter your new password</p>

        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>

        <div className="login-footer">
          <p>🔒 Encrypted connection required</p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
