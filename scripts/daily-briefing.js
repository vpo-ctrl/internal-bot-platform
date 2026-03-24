#!/usr/bin/env node
/**
 * Daily Briefing
 * 
 * Purpose: Summarize day ahead + pending tasks + recent notes
 * Schedule: 9 AM daily (via cron)
 * Delivery: Telegram to Al Mal
 */

const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/bot-config.json'),
  'utf8'
));

const taskBot = require('../bots/task-bot.js');
const calendarBot = require('../bots/calendar-bot.js');
const notesBot = require('../bots/notes-bot.js');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Daily Briefing] ${message}`);
  fs.appendFileSync(
    CONFIG.logging.file,
    `[${timestamp}] [Daily Briefing] ${message}\n`
  );
}

/**
 * Format tasks for briefing
 */
function formatTasks() {
  try {
    const pending = taskBot.getPending();
    
    if (!pending.success || pending.tasks.length === 0) {
      return '✅ TASKS: No pending tasks!';
    }
    
    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
    const formatted = pending.tasks
      .map(t => `${priorityEmoji[t.priority]} ${t.text}`)
      .join('\n');
    
    return `📋 TASKS (${pending.tasks.length} pending):\n${formatted}`;
  } catch (error) {
    log(`Error formatting tasks: ${error.message}`);
    return '❌ Error loading tasks';
  }
}

/**
 * Format calendar for briefing
 */
function formatCalendar() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const events = calendarBot.getTodayEvents();
    
    if (!events.success || events.events.length === 0) {
      return '📅 CALENDAR: No events today';
    }
    
    const formatted = events.events
      .map(e => {
        const time = e.time ? ` @ ${e.time}` : '';
        return `• ${e.title}${time}`;
      })
      .join('\n');
    
    return `📅 CALENDAR (${events.events.length} events):\n${formatted}`;
  } catch (error) {
    log(`Error formatting calendar: ${error.message}`);
    return '❌ Error loading calendar';
  }
}

/**
 * Format recent notes
 */
function formatNotes() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const notes = notesBot.listNotes(today);
    
    if (!notes.success || notes.notes.length === 0) {
      return '';
    }
    
    const preview = notes.notes
      .slice(0, 3)
      .map(n => `• ${n.filename.replace('.md', '')}`)
      .join('\n');
    
    return `\n💡 NOTES (${notes.notes.length} today):\n${preview}`;
  } catch (error) {
    log(`Error formatting notes: ${error.message}`);
    return '';
  }
}

/**
 * Generate briefing message
 */
function generateBriefing() {
  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    
    log(`📊 Generating briefing for ${dateStr}`);
    
    const briefing = `
═══════════════════════════════════════
📋 DAILY BRIEFING — ${dateStr.toUpperCase()}
═══════════════════════════════════════

${formatCalendar()}

${formatTasks()}
${formatNotes()}

═══════════════════════════════════════
🎤 Voice: "Add a note" / "Create a task" / "Schedule a meeting"

Questions? Ask anytime!
═══════════════════════════════════════
`.trim();
    
    return briefing;
  } catch (error) {
    log(`Error generating briefing: ${error.message}`);
    return '❌ Error generating briefing';
  }
}

/**
 * Save briefing to file
 */
function saveBriefing(briefing) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const briefingPath = path.join(
      CONFIG.baseDir,
      'storage',
      `briefing-${today}.txt`
    );
    
    fs.writeFileSync(briefingPath, briefing, 'utf8');
    log(`✅ Briefing saved: ${briefingPath}`);
    
    return briefingPath;
  } catch (error) {
    log(`Error saving briefing: ${error.message}`);
    return null;
  }
}

/**
 * Send briefing via Telegram (would need message tool integration)
 */
function sendBriefing(briefing) {
  try {
    log(`📤 Ready to send briefing to Telegram (${CONFIG.briefing.recipient})`);
    
    // In real implementation, this would call the message tool
    // For now, just save and log
    
    // Save to file for transmission
    const today = new Date().toISOString().split('T')[0];
    const msgPath = path.join(
      CONFIG.baseDir,
      'storage',
      `briefing-msg-${today}.txt`
    );
    
    fs.writeFileSync(msgPath, briefing, 'utf8');
    log(`💬 Briefing message ready: ${msgPath}`);
    
    return {
      success: true,
      message: briefing,
      recipient: CONFIG.briefing.recipient,
      file: msgPath
    };
  } catch (error) {
    log(`Error sending briefing: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Run full briefing workflow
 */
function runBriefing() {
  try {
    log('🌅 Daily Briefing started');
    
    // Generate
    const briefing = generateBriefing();
    
    // Save
    const savedPath = saveBriefing(briefing);
    
    // Prepare for sending
    const result = sendBriefing(briefing);
    
    if (result.success) {
      log('✅ Briefing complete and ready to send');
      return {
        success: true,
        briefing: briefing,
        savedPath: savedPath,
        recipient: result.recipient
      };
    } else {
      log(`❌ Briefing failed: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    log(`❌ Briefing error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🤖 Daily Briefing started');
  
  if (command === 'run' || !command) {
    const result = runBriefing();
    console.log('\n' + result.briefing);
    if (result.savedPath) {
      console.log(`\n✅ Saved to: ${result.savedPath}`);
    }
  } else if (command === 'preview') {
    const briefing = generateBriefing();
    console.log('\n' + briefing);
  } else {
    console.log(`
Daily Briefing — CLI Interface

Commands:
  run                     Run full briefing (generate + save + prepare)
  preview                 Preview briefing without saving

Examples:
  node daily-briefing.js run
  node daily-briefing.js preview
    `);
  }
}

module.exports = {
  generateBriefing,
  saveBriefing,
  sendBriefing,
  runBriefing
};
