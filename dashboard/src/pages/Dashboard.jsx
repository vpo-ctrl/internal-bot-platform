import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TasksTab from '../components/TasksTab';
import NotesTab from '../components/NotesTab';
import CalendarTab from '../components/CalendarTab';
import '../styles/Dashboard.css';

function Dashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingTasks: 0,
    todayEvents: 0,
    totalNotes: 0
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Get user info from token
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setUser(decoded);
    } catch (e) {
      console.error('Failed to decode token');
    }

    // Load stats
    loadStats();
  }, [token]);

  const loadStats = async () => {
    try {
      const [tasksRes, calendarRes] = await Promise.all([
        axios.get(`${API_URL}/api/tasks/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/calendar/today`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setStats({
        pendingTasks: tasksRes.data.tasks?.length || 0,
        todayEvents: calendarRes.data.events?.length || 0,
        totalNotes: 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>🎤 Internal Bot Platform</h1>
          {user && <p className="user-info">Welcome, {user.name}</p>}
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </header>

      {/* Navigation */}
      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          ✅ Tasks
        </button>
        <button
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notes
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 Calendar
        </button>
      </nav>

      {/* Content */}
      <main className="content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-overview">
            <h2>Today's Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h3>Pending Tasks</h3>
                  <p className="stat-number">{stats.pendingTasks}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>Today's Events</h3>
                  <p className="stat-number">{stats.todayEvents}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <h3>Total Notes</h3>
                  <p className="stat-number">{stats.totalNotes}</p>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <button onClick={() => setActiveTab('tasks')} className="action-btn">
                + Add Task
              </button>
              <button onClick={() => setActiveTab('notes')} className="action-btn">
                + Add Note
              </button>
              <button onClick={() => setActiveTab('calendar')} className="action-btn">
                + Add Event
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && <TasksTab token={token} apiUrl={API_URL} />}
        {activeTab === 'notes' && <NotesTab token={token} apiUrl={API_URL} />}
        {activeTab === 'calendar' && <CalendarTab token={token} apiUrl={API_URL} />}
      </main>
    </div>
  );
}

export default Dashboard;
