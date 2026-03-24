import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/NotesTab.css';

function NotesTab({ token, apiUrl }) {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      searchNotes();
    } else {
      loadNotes();
    }
  }, [selectedDate, searchQuery]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/notes`, {
        params: { date: selectedDate },
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data.notes || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchNotes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/notes/search`, {
        params: { q: searchQuery },
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotes(response.data.results || []);
    } catch (err) {
      console.error('Error searching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await axios.post(
        `${apiUrl}/api/notes`,
        { text: newNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewNote('');
      loadNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  return (
    <div className="notes-tab">
      <h2>📝 Notes</h2>

      {/* Add Note Form */}
      <form className="add-note-form" onSubmit={handleAddNote}>
        <textarea
          placeholder="Add a new note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="note-input"
          rows="3"
        />
        <button type="submit" className="add-btn">
          Add Note
        </button>
      </form>

      {/* Search and Filter */}
      <div className="notes-controls">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {!searchQuery && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        )}
      </div>

      {/* Notes List */}
      <div className="notes-list">
        {loading ? (
          <p>Loading...</p>
        ) : notes.length === 0 ? (
          <p className="empty">No notes found.</p>
        ) : (
          notes.map((note) => (
            <div key={note.filename || note.id} className="note-item">
              <h4>{note.filename || 'Note'}</h4>
              <p>{note.preview || note.text}</p>
              <small>{note.date || selectedDate}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotesTab;
