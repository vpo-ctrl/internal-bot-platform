import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ResetPassword from './pages/ResetPassword';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
    } else {
      // TEMPORARY: Auto-login for testing
      const dummyToken = 'test-token-' + Date.now();
      localStorage.setItem('token', dummyToken);
      setToken(dummyToken);
      setIsLoggedIn(true);
      console.log('🧪 Test mode: Auto-logged in');
    }
    setLoading(false);
  }, []);

  const handleLogin = (authToken) => {
    setToken(authToken);
    setIsLoggedIn(true);
    localStorage.setItem('token', authToken);
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
    localStorage.removeItem('token');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/reset-password" 
            element={<ResetPassword />} 
          />
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Dashboard token={token} onLogout={handleLogout} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
