#!/usr/bin/env node
/**
 * Calendar Bot - MongoDB Version
 * 
 * Purpose: Manage meetings and events
 * Storage: MongoDB (persistent cloud database)
 * Interface: add-event, list-events, reschedule-event, delete-event
 */

const crypto = require('crypto');
const { connectDB } = require('./db-connection');
const { Event } = require('./schemas');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Calendar Bot] ${message}`);
}

/**
 * Add an event
 */
async function addEvent(title, date, time = null, duration = 60, attendees = [], notes = '') {
  try {
    await connectDB();

    const eventId = crypto.randomBytes(6).toString('hex');

    const newEvent = new Event({
      id: eventId,
      title: title,
      date: date,
      time: time,
      duration: duration,
      attendees: attendees,
      notes: notes,
      created: new Date()
    });

    await newEvent.save();

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
async function listEvents(fromDate = null, toDate = null) {
  try {
    await connectDB();

    const from = fromDate || '1900-01-01';
    const to = toDate || '2099-12-31';

    const events = await Event.find({
      date: { $gte: from, $lte: to }
    }).sort({ date: 1, time: 1 });

    log(`✅ Listed ${events.length} events from ${from} to ${to}`);
    return { success: true, events, fromDate: from, toDate: to };
  } catch (error) {
    log(`❌ Error listing events: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get today's events
 */
async function getTodayEvents() {
  try {
    await connectDB();

    const today = new Date().toISOString().split('T')[0];
    const result = await listEvents(today, today);

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
async function rescheduleEvent(eventId, newDate, newTime = null) {
  try {
    await connectDB();

    const event = await Event.findOneAndUpdate(
      { id: eventId },
      { 
        date: newDate,
        ...(newTime && { time: newTime })
      },
      { new: true }
    );

    if (!event) {
      log(`⚠️ Event not found: ${eventId}`);
      return { success: false, error: 'Event not found' };
    }

    log(`✅ Event rescheduled: "${event.title}" to ${newDate}`);
    return { success: true, event };
  } catch (error) {
    log(`❌ Error rescheduling event: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an event
 */
async function deleteEvent(eventId) {
  try {
    await connectDB();

    const event = await Event.findOneAndDelete({ id: eventId });

    if (!event) {
      log(`⚠️ Event not found: ${eventId}`);
      return { success: false, error: 'Event not found' };
    }

    log(`✅ Event deleted: "${event.title}"`);
    return { success: true, event };
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

  (async () => {
    try {
      if (command === 'add' && args[1]) {
        const title = args[1];
        const date = args[2];
        const time = args[3] || null;
        const result = await addEvent(title, date, time);
        console.log('\n✅ Event added:', result.event);
      } else if (command === 'today') {
        const result = await getTodayEvents();
        console.log('\n✅ Today\'s events:', result.events);
      } else if (command === 'list') {
        const from = args[1] || null;
        const to = args[2] || null;
        const result = await listEvents(from, to);
        console.log('\n✅ Events:', result.events);
      } else if (command === 'reschedule' && args[1] && args[2]) {
        const eventId = args[1];
        const newDate = args[2];
        const newTime = args[3] || null;
        const result = await rescheduleEvent(eventId, newDate, newTime);
        console.log('\n✅ Rescheduled:', result.event);
      } else if (command === 'delete' && args[1]) {
        const result = await deleteEvent(args[1]);
        console.log('\n✅ Deleted:', result.event);
      } else {
        console.log(`
Calendar Bot — MongoDB CLI Interface

Commands:
  add <title> <date> [time]       Add event
  today                            Show today's events
  list [from] [to]                 List events
  reschedule <eventId> <date>      Reschedule event
  delete <eventId>                 Delete event
        `);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  })();
}

module.exports = {
  addEvent,
  listEvents,
  getTodayEvents,
  rescheduleEvent,
  deleteEvent
};
