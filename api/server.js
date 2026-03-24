#!/usr/bin/env node
/**
 * Internal Bot Platform REST API
 * 
 * Purpose: Serve data from bots to web dashboard
 * Authentication: JWT-based with session management
 * Endpoints: /api/tasks, /api/notes, /api/calendar, etc.
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load configuration
const CONFIG = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/bot-config.json'),
  'utf8'
));

// Import bot modules
const taskBot = require('../bots/task-bot.js');
const notesBot = require('../bots/notes-bot.js');
const calendarBot = require('../bots/calendar-bot.js');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'https://render.com'],
  credentials: true
}));

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [API] ${message}`);
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Hardcoded credentials (in production, use environment variables)
 */
const USERS = {
  'almali': {
    password: process.env.API_PASSWORD || 'change-me-2026',
    name: 'Al Mal (VPO)'
  }
};

/**
 * Login endpoint
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = USERS[username];
    if (!user || user.password !== password) {
      log(`❌ Failed login attempt for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { username, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    log(`✅ User logged in: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        username,
        name: user.name
      }
    });
  } catch (error) {
    log(`❌ Login error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Authentication middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      log(`❌ Invalid token`);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// ============================================
// TASK ENDPOINTS
// ============================================

/**
 * GET /api/tasks - List all tasks
 */
app.get('/api/tasks', authenticateToken, (req, res) => {
  try {
    const { status, priority } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    const result = taskBot.listTasks(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/pending - Get pending tasks
 */
app.get('/api/tasks/pending', authenticateToken, (req, res) => {
  try {
    const result = taskBot.getPending();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks - Create a task
 */
app.post('/api/tasks', authenticateToken, (req, res) => {
  try {
    const { text, due, priority, tags } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Task text required' });
    }

    const result = taskBot.addTask(text, due, priority || 'medium', tags || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tasks/:id/complete - Mark task complete
 */
app.patch('/api/tasks/:id/complete', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const result = taskBot.completeTask(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id - Delete task
 */
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const result = taskBot.deleteTask(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// NOTES ENDPOINTS
// ============================================

/**
 * GET /api/notes - List notes by date
 */
app.get('/api/notes', authenticateToken, (req, res) => {
  try {
    const { date } = req.query;
    const result = notesBot.listNotes(date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notes/search - Search notes
 */
app.get('/api/notes/search', authenticateToken, (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const result = notesBot.searchNotes(q);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes - Create note
 */
app.post('/api/notes', authenticateToken, (req, res) => {
  try {
    const { text, tags } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Note text required' });
    }

    const result = notesBot.addNote(text, tags || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notes/:date/:filename - Get note content
 */
app.get('/api/notes/:date/:filename', authenticateToken, (req, res) => {
  try {
    const { date, filename } = req.params;
    const result = notesBot.getNote(date, filename);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CALENDAR ENDPOINTS
// ============================================

/**
 * GET /api/calendar - List events
 */
app.get('/api/calendar', authenticateToken, (req, res) => {
  try {
    const { from, to } = req.query;
    const result = calendarBot.listEvents(from, to);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendar/today - Get today's events
 */
app.get('/api/calendar/today', authenticateToken, (req, res) => {
  try {
    const result = calendarBot.getTodayEvents();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar - Create event
 */
app.post('/api/calendar', authenticateToken, (req, res) => {
  try {
    const { title, date, time, duration, attendees, notes } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date required' });
    }

    const result = calendarBot.addEvent(
      title,
      date,
      time,
      duration || 60,
      attendees || [],
      notes || ''
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/calendar/:id - Reschedule event
 */
app.patch('/api/calendar/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'New date required' });
    }

    const result = calendarBot.rescheduleEvent(id, date, time);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/calendar/:id - Delete event
 */
app.delete('/api/calendar/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const result = calendarBot.deleteEvent(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/health - API health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Internal Bot Platform API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET / - Welcome page
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Internal Bot Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth/login',
      tasks: '/api/tasks',
      notes: '/api/notes',
      calendar: '/api/calendar',
      health: '/api/health'
    },
    docs: 'See PHASE-3.md for full documentation'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  log(`❌ Error: ${err.message}`);
  res.status(500).json({ error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  log(`🚀 API Server started on port ${PORT}`);
  log(`📍 Access at: http://localhost:${PORT}`);
  log(`🔐 Authentication: JWT (login required)`);
  log(`✅ Ready for connections`);
});

module.exports = app;
