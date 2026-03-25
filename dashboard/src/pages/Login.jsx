import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('almali');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'https://internal-bot-api-gbsx.onrender.com';

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 API URL:', API_URL);
    console.log('🔍 VITE_API_URL env:', import.meta.env.VITE_API_URL);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('📤 Sending login request to:', `${API_URL}/api/auth/login`);
      console.log('👤 Username:', username);
      
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });

      console.log('✅ Login successful:', response.data);
      
      if (response.data.token) {
        onLogin(response.data.token);
      } else {
        setError('Login failed: No token received');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.message);
      
      setError(err.response?.data?.error || err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        username
      });

      setResetMessage('✅ If account exists, reset link has been sent to the registered email.');
      setUsername('');
      setTimeout(() => setMode('login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process reset request.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🎤 Internal Bot Platform</h1>
        <p className="subtitle">Secure Access Required</p>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
              }}
              className="forgot-link"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label htmlFor="reset-username">Username</label>
              <input
                id="reset-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {resetMessage && <div className="success-message">{resetMessage}</div>}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setResetMessage('');
              }}
              className="forgot-link"
            >
              Back to login
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>🔒 Encrypted connection required</p>
          <p className="version">v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
