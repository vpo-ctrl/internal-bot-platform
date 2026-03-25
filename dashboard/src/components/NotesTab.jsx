import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/NotesTab.css';

function NotesTab({ token, apiUrl }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState({ text: '', tags: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchNotes();
    } else {
      setFilteredNotes(notes);
    }
  }, [searchQuery, notes]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data.notes || []);
      setFilteredNotes(response.data.notes || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchNotes = async () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    try {
      const response = await axios.get(
        `${apiUrl}/api/notes/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFilteredNotes(response.data.notes || []);
    } catch (err) {
      console.error('Error searching notes:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.text.trim()) return;

    try {
      const tags = newNote.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      await axios.post(
        `${apiUrl}/api/notes`,
        { text: newNote.text, tags },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewNote({ text: '', tags: '' });
      loadNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Delete this note?')) {
      try {
        // Note: API might not have delete endpoint, check implementation
        await axios.delete(
          `${apiUrl}/api/notes/${noteId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {
          // Fallback if delete not implemented
          console.log('Delete not available, reloading instead');
          loadNotes();
        });
        loadNotes();
      } catch (err) {
        console.error('Error deleting note:', err);
      }
    }
  };

  return (
    <div className="notes-tab">
      <h2>📝 Notes</h2>

      {/* Add Note Form */}
      <form className="add-note-form" onSubmit={handleAddNote}>
        <textarea
          placeholder="Write a note..."
          value={newNote.text}
          onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
          className="note-input"
          rows="3"
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={newNote.tags}
          onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
          className="tags-input"
        />
        <button type="submit" className="add-btn">Add Note</button>
      </form>

      {/* Search */}
      <div className="search-notes">
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Notes List */}
      <div className="notes-list">
        {loading ? (
          <p className="loading">Loading notes...</p>
        ) : filteredNotes.length === 0 ? (
          <p className="empty">
            {searchQuery ? 'No notes found. Try a different search.' : 'No notes yet. Create one above! 📝'}
          </p>
        ) : (
          filteredNotes.map((note) => (
            <div key={note.id} className="note-item">
              <div className="note-content">
                <p className="note-text">{note.text}</p>
                <div className="note-meta">
                  <span className="note-date">
                    📅 {new Date(note.created).toLocaleDateString()}
                  </span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag, idx) => (
                        <span key={idx} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={() => handleDeleteNote(note.id)}
                title="Delete note"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotesTab;
