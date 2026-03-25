#!/usr/bin/env node
/**
 * Notes Bot - MongoDB Version
 * 
 * Purpose: Store and organize quick captures, ideas, and observations
 * Storage: MongoDB (persistent cloud database)
 * Interface: add-note, list-notes, search-notes
 */

const crypto = require('crypto');
const { connectDB } = require('./db-connection');
const { Note } = require('./schemas');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Notes Bot] ${message}`);
}

/**
 * Add a note
 */
async function addNote(text, tags = []) {
  try {
    await connectDB();

    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `${time}-note.md`;
    const noteId = crypto.randomBytes(6).toString('hex');

    const newNote = new Note({
      id: noteId,
      date: dateFolder,
      filename: filename,
      text: text,
      tags: tags,
      created: now
    });

    await newNote.save();

    log(`✅ Note added: ${filename}`);
    console.log(`   Content: ${text.substring(0, 50)}...`);

    return {
      success: true,
      noteId: filename,
      note: newNote,
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
async function listNotes(dateStr = null) {
  try {
    await connectDB();

    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    const notes = await Note.find({ date: targetDate });

    if (notes.length === 0) {
      log(`⚠️ No notes found for ${targetDate}`);
      return { success: true, notes: [], date: targetDate };
    }

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
async function searchNotes(query) {
  try {
    await connectDB();

    const results = await Note.find({
      $or: [
        { text: { $regex: query, $options: 'i' } },
        { tags: { $in: [query] } },
        { filename: { $regex: query, $options: 'i' } }
      ]
    }).sort({ created: -1 });

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
async function getNote(noteId) {
  try {
    await connectDB();

    const note = await Note.findOne({ id: noteId });

    if (!note) {
      log(`⚠️ Note not found: ${noteId}`);
      return { success: false, error: 'Note not found' };
    }

    return { success: true, content: note.text, note };
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

  (async () => {
    try {
      if (command === 'add' && args[1]) {
        const text = args.slice(1).join(' ');
        const result = await addNote(text);
        console.log('\n✅ Note added:', result.note);
      } else if (command === 'list') {
        const date = args[1] || null;
        const result = await listNotes(date);
        console.log('\n✅ Notes:', result.notes);
      } else if (command === 'search' && args[1]) {
        const query = args.slice(1).join(' ');
        const result = await searchNotes(query);
        console.log('\n✅ Results:', result.results);
      } else if (command === 'get' && args[1]) {
        const noteId = args[1];
        const result = await getNote(noteId);
        console.log('\n✅ Note:', result.note);
      } else {
        console.log(`
Notes Bot — MongoDB CLI Interface

Commands:
  add <text>              Add a note
  list [date]             List notes (default: today)
  search <query>          Search notes
  get <noteId>            Get note content
        `);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  })();
}

module.exports = {
  addNote,
  listNotes,
  searchNotes,
  getNote
};
