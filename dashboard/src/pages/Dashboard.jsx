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
  const [todayFocus, setTodayFocus] = useState({
    tasks: [],
    events: []
  });
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
      setLoading(true);

      const [tasksRes, calendarRes, notesRes] = await Promise.all([
        axios.get(`${API_URL}/api/tasks/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/calendar/today`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/notes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pendingTasks = [...(tasksRes.data.tasks || [])].sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
        if (priorityDiff !== 0) return priorityDiff;
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      });

      const todayEvents = [...(calendarRes.data.events || [])].sort((a, b) => {
        return (a.time || '23:59').localeCompare(b.time || '23:59');
      });

      setStats({
        pendingTasks: pendingTasks.length,
        todayEvents: todayEvents.length,
        totalNotes: notesRes.data.notes?.length || 0
      });

      setTodayFocus({
        tasks: pendingTasks.slice(0, 5),
        events: todayEvents
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
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
                  <h3>Today's Notes</h3>
                  <p className="stat-number">{stats.totalNotes}</p>
                </div>
              </div>
            </div>

            <div className="today-focus">
              <section className="focus-card">
                <div className="focus-card-header">
                  <div>
                    <h3>Today's Agenda</h3>
                    <p>Meetings and time-based commitments</p>
                  </div>
                  <button onClick={() => setActiveTab('calendar')} className="focus-link-btn">
                    Open Calendar
                  </button>
                </div>

                {loading ? (
                  <p className="focus-empty">Loading today's events...</p>
                ) : todayFocus.events.length === 0 ? (
                  <p className="focus-empty">No meetings scheduled for today.</p>
                ) : (
                  <div className="focus-list">
                    {todayFocus.events.map((event) => (
                      <div key={event.id} className="focus-item">
                        <div className="focus-time">{event.time || 'Any time'}</div>
                        <div className="focus-body">
                          <strong>{event.title}</strong>
                          {event.notes && <p>{event.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="focus-card">
                <div className="focus-card-header">
                  <div>
                    <h3>Priority Tasks</h3>
                    <p>What deserves attention next</p>
                  </div>
                  <button onClick={() => setActiveTab('tasks')} className="focus-link-btn">
                    Open Tasks
                  </button>
                </div>

                {loading ? (
                  <p className="focus-empty">Loading pending tasks...</p>
                ) : todayFocus.tasks.length === 0 ? (
                  <p className="focus-empty">No pending tasks. Nice. 🎉</p>
                ) : (
                  <div className="focus-list">
                    {todayFocus.tasks.map((task) => (
                      <div key={task.id} className="focus-item">
                        <div className={`task-priority-badge priority-${task.priority}`}>
                          {task.priority}
                        </div>
                        <div className="focus-body">
                          <strong>{task.text}</strong>
                          <p>{task.due ? `Due ${task.due}` : 'No due date'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
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
