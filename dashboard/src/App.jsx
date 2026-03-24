import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
    <div className="app">
      {isLoggedIn ? (
        <Dashboard token={token} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
