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
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Load configuration
const configPath = path.join(__dirname, '../config/bot-config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Resolve storage paths relative to api directory
CONFIG.storage.notesDir = path.join(__dirname, '../storage/notes');
CONFIG.storage.tasksFile = path.join(__dirname, '../storage/tasks.json');
CONFIG.storage.calendarFile = path.join(__dirname, '../storage/calendar.json');

// Import bot modules
const taskBot = require('../bots/task-bot.js');
const notesBot = require('../bots/notes-bot.js');
const calendarBot = require('../bots/calendar-bot.js');
const { connectDB } = require('../bots/db-connection.js');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS middleware FIRST (before everything else!)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Email configuration
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'noreply@amhostels.com',
    pass: process.env.EMAIL_PASSWORD || ''
  }
};

const transporter = nodemailer.createTransport(emailConfig);

// Store reset tokens (in production, use database)
const resetTokens = new Map();

// Middleware
app.use(express.json());

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
    password: 'Golden2020!@#general',
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
 * Forgot password endpoint
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const user = USERS[username];
    if (!user) {
      // Don't reveal if user exists
      return res.json({ 
        success: true, 
        message: 'If account exists, reset link sent to registered email' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Store token with expiry (15 minutes)
    resetTokens.set(resetHash, {
      username,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    // Create reset URL (for production, use your domain)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

    // Send email
    const mailOptions = {
      from: 'Internal Bot Platform <noreply@amhostels.com>',
      to: process.env.ADMIN_EMAIL || 'almali@amhostels.com',
      subject: '🔐 Password Reset Request - Internal Bot Platform',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password (valid for 15 minutes):</p>
        <p><a href="${resetUrl}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p>Or copy this link: <code>${resetUrl}</code></p>
        <p><small>If you didn't request this, ignore this email.</small></p>
      `
    };

    // Send email (non-blocking)
    if (process.env.EMAIL_PASSWORD) {
      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          log(`⚠️ Email send error: ${error.message}`);
        } else {
          log(`✅ Reset email sent to: ${process.env.ADMIN_EMAIL}`);
        }
      });
    }

    log(`✅ Password reset requested for: ${username}`);

    res.json({ 
      success: true, 
      message: 'Reset link sent to registered email' 
    });
  } catch (error) {
    log(`❌ Forgot password error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reset password endpoint
 */
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash token
    const resetHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetData = resetTokens.get(resetHash);

    if (!resetData) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    if (resetData.expiresAt < Date.now()) {
      resetTokens.delete(resetHash);
      return res.status(401).json({ error: 'Reset token expired' });
    }

    // Update password
    const username = resetData.username;
    USERS[username].password = newPassword;

    // Clear token
    resetTokens.delete(resetHash);

    log(`✅ Password reset for: ${username}`);

    res.json({ 
      success: true, 
      message: 'Password reset successfully. You can now login with your new password.' 
    });
  } catch (error) {
    log(`❌ Reset password error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify reset token endpoint
 */
app.get('/api/auth/verify-reset-token', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const resetHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetData = resetTokens.get(resetHash);

    if (!resetData || resetData.expiresAt < Date.now()) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    res.json({ success: true, message: 'Token is valid' });
  } catch (error) {
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
  
  // Connect to MongoDB in background (non-blocking)
  connectDB().then(() => {
    log(`🗄️  Database: MongoDB Atlas connected`);
  }).catch((error) => {
    log(`⚠️  MongoDB connection failed: ${error.message}`);
    log(`⚠️  Login will work, but tasks/notes/calendar may fail`);
  });
});

module.exports = app;
