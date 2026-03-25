#!/usr/bin/env node
/**
 * Calendar Bot
 * 
 * Purpose: Manage meetings and events
 * Storage: JSON file with events array
 * Interface: add-event, list-events, reschedule-event, delete-event
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const configPath = path.join(__dirname, '../config/bot-config.json');
const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Resolve storage path relative to bot directory
const CALENDAR_FILE = path.join(__dirname, '../storage/calendar.json');

// Initialize calendar file if it doesn't exist
function initCalendar() {
  if (!fs.existsSync(CALENDAR_FILE)) {
    const initialCalendar = { events: [], lastUpdated: new Date().toISOString() };
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(initialCalendar, null, 2), 'utf8');
  }
}

initCalendar();

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Calendar Bot] ${message}`);
  fs.appendFileSync(
    CONFIG.logging.file,
    `[${timestamp}] [Calendar Bot] ${message}\n`
  );
}

/**
 * Load calendar from file
 */
function loadCalendar() {
  try {
    const content = fs.readFileSync(CALENDAR_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`⚠️  Error loading calendar: ${error.message}`);
    return { events: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save calendar to file
 */
function saveCalendar(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(data, null, 2), 'utf8');
    log(`✅ Calendar saved (${data.events.length} events)`);
  } catch (error) {
    log(`❌ Error saving calendar: ${error.message}`);
  }
}

/**
 * Add an event
 */
function addEvent(title, date, time = null, duration = 60, attendees = [], notes = '') {
  try {
    const calendar = loadCalendar();
    const eventId = crypto.randomBytes(6).toString('hex');
    
    const newEvent = {
      id: eventId,
      title: title,
      date: date, // YYYY-MM-DD
      time: time, // HH:MM (24h format)
      duration: duration, // minutes
      attendees: attendees,
      notes: notes,
      created: new Date().toISOString()
    };
    
    calendar.events.push(newEvent);
    saveCalendar(calendar);
    
    const timeStr = time ? ` at ${time}` : '';
    log(`✅ Event added: "${title}" on ${date}${timeStr}`);
    return { success: true, eventId, event: newEvent };
  } catch (error) {
    log(`❌ Error adding event: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * List events for a date range
 */
function listEvents(fromDate = null, toDate = null) {
  try {
    const calendar = loadCalendar();
    let filtered = calendar.events;
    
    const from = fromDate || '1900-01-01';
    const to = toDate || '2099-12-31';
    
    filtered = filtered.filter(e => 
      e.date >= from && e.date <= to
    ).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
    
    log(`✅ Listed ${filtered.length} events from ${from} to ${to}`);
    return { success: true, events: filtered, fromDate: from, toDate: to };
  } catch (error) {
    log(`❌ Error listing events: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get today's events
 */
function getTodayEvents() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = listEvents(today, today);
    log(`✅ Retrieved ${result.events.length} events for today`);
    return { ...result, today };
  } catch (error) {
    log(`❌ Error getting today's events: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Reschedule an event
 */
function rescheduleEvent(eventId, newDate, newTime = null) {
  try {
    const calendar = loadCalendar();
    const event = calendar.events.find(e => e.id === eventId);
    
    if (!event) {
      log(`⚠️  Event not found: ${eventId}`);
      return { success: false, error: 'Event not found' };
    }
    
    const oldDate = event.date;
    event.date = newDate;
    if (newTime) event.time = newTime;
    
    saveCalendar(calendar);
    
    log(`✅ Event rescheduled: "${event.title}" from ${oldDate} to ${newDate}`);
    return { success: true, event };
  } catch (error) {
    log(`❌ Error rescheduling event: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an event
 */
function deleteEvent(eventId) {
  try {
    const calendar = loadCalendar();
    const index = calendar.events.findIndex(e => e.id === eventId);
    
    if (index === -1) {
      log(`⚠️  Event not found: ${eventId}`);
      return { success: false, error: 'Event not found' };
    }
    
    const deleted = calendar.events[index];
    calendar.events.splice(index, 1);
    saveCalendar(calendar);
    
    log(`✅ Event deleted: "${deleted.title}"`);
    return { success: true, event: deleted };
  } catch (error) {
    log(`❌ Error deleting event: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🤖 Calendar Bot started');
  
  if (command === 'add' && args[1]) {
    // add "Event Title" YYYY-MM-DD [HH:MM]
    const title = args[1];
    const date = args[2];
    const time = args[3] || null;
    addEvent(title, date, time);
  } else if (command === 'today') {
    getTodayEvents();
  } else if (command === 'list') {
    const from = args[1] || null;
    const to = args[2] || null;
    listEvents(from, to);
  } else if (command === 'reschedule' && args[1] && args[2]) {
    const eventId = args[1];
    const newDate = args[2];
    const newTime = args[3] || null;
    rescheduleEvent(eventId, newDate, newTime);
  } else if (command === 'delete' && args[1]) {
    deleteEvent(args[1]);
  } else {
    console.log(`
Calendar Bot — CLI Interface

Commands:
  add <title> <date> [time]       Add event (time: HH:MM optional)
  today                            Show today's events
  list [from] [to]                 List events (dates: YYYY-MM-DD)
  reschedule <eventId> <date>      Reschedule event
  delete <eventId>                 Delete event

Examples:
  node calendar-bot.js add "FrontDesk meeting" 2026-03-25 14:00
  node calendar-bot.js today
  node calendar-bot.js list 2026-03-25 2026-03-31
    `);
  }
}

module.exports = {
  addEvent,
  listEvents,
  getTodayEvents,
  rescheduleEvent,
  deleteEvent,
  loadCalendar,
  saveCalendar
};
