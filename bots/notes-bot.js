#!/usr/bin/env node
/**
 * Notes Bot
 * 
 * Purpose: Store and organize quick captures, ideas, and observations
 * Storage: Markdown files organized by date
 * Interface: add-note, list-notes, search-notes
 */

const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/bot-config.json'),
  'utf8'
));

const NOTES_DIR = CONFIG.storage.notesDir;

// Ensure notes directory exists
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Notes Bot] ${message}`);
  fs.appendFileSync(
    CONFIG.logging.file,
    `[${timestamp}] [Notes Bot] ${message}\n`
  );
}

/**
 * Add a note
 */
function addNote(text, tags = []) {
  try {
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
    
    const datePath = path.join(NOTES_DIR, dateFolder);
    if (!fs.existsSync(datePath)) {
      fs.mkdirSync(datePath, { recursive: true });
    }
    
    // Create filename
    const filename = `${time}-note.md`;
    const filePath = path.join(datePath, filename);
    
    // Create note content
    const content = `# Note — ${now.toLocaleString()}

**Tags:** ${tags.length > 0 ? tags.join(', ') : 'none'}

${text}

---
*Created: ${now.toISOString()}*
`;
    
    // Write to file
    fs.writeFileSync(filePath, content, 'utf8');
    
    log(`✅ Note added: ${filename}`);
    console.log(`   Content: ${text.substring(0, 50)}...`);
    
    return {
      success: true,
      noteId: filename,
      path: filePath,
      timestamp: now.toISOString()
    };
  } catch (error) {
    log(`❌ Error adding note: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * List notes for a specific date
 */
function listNotes(dateStr = null) {
  try {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const datePath = path.join(NOTES_DIR, targetDate);
    
    if (!fs.existsSync(datePath)) {
      log(`⚠️  No notes found for ${targetDate}`);
      return { success: true, notes: [], date: targetDate };
    }
    
    const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
    const notes = files.map(file => ({
      filename: file,
      path: path.join(datePath, file),
      timestamp: file.split('-')[0]
    }));
    
    log(`✅ Listed ${notes.length} notes for ${targetDate}`);
    return { success: true, notes, date: targetDate };
  } catch (error) {
    log(`❌ Error listing notes: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Search notes across all dates
 */
function searchNotes(query) {
  try {
    const results = [];
    const allDates = fs.readdirSync(NOTES_DIR);
    
    allDates.forEach(dateFolder => {
      const datePath = path.join(NOTES_DIR, dateFolder);
      if (!fs.statSync(datePath).isDirectory()) return;
      
      const files = fs.readdirSync(datePath).filter(f => f.endsWith('.md'));
      files.forEach(file => {
        const filePath = path.join(datePath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            filename: file,
            date: dateFolder,
            path: filePath,
            preview: content.substring(0, 100)
          });
        }
      });
    });
    
    log(`✅ Search for "${query}": ${results.length} results`);
    return { success: true, query, results };
  } catch (error) {
    log(`❌ Error searching notes: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get note content
 */
function getNote(dateStr, filename) {
  try {
    const filePath = path.join(NOTES_DIR, dateStr, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content, filename, date: dateStr };
  } catch (error) {
    log(`❌ Error reading note: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🤖 Notes Bot started');
  
  if (command === 'add' && args[1]) {
    const text = args.slice(1).join(' ');
    addNote(text);
  } else if (command === 'list') {
    const date = args[1] || null;
    listNotes(date);
  } else if (command === 'search' && args[1]) {
    const query = args.slice(1).join(' ');
    searchNotes(query);
  } else if (command === 'get' && args[1] && args[2]) {
    getNote(args[1], args[2]);
  } else {
    console.log(`
Notes Bot — CLI Interface

Commands:
  add <text>              Add a note
  list [date]             List notes (default: today)
  search <query>          Search notes
  get <date> <filename>   Get note content

Examples:
  node notes-bot.js add "Cinema occupancy up 5%"
  node notes-bot.js list 2026-03-24
  node notes-bot.js search "occupancy"
    `);
  }
}

module.exports = {
  addNote,
  listNotes,
  searchNotes,
  getNote
};
