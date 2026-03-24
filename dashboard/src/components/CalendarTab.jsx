import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/CalendarTab.css';

function CalendarTab({ token, apiUrl }) {
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/calendar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data.events || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.date) return;

    try {
      await axios.post(
        `${apiUrl}/api/calendar`,
        {
          title: newEvent.title,
          date: newEvent.date,
          time: newEvent.time
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewEvent({ title: '', date: new Date().toISOString().split('T')[0], time: '09:00' });
      loadEvents();
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Delete this event?')) {
      try {
        await axios.delete(
          `${apiUrl}/api/calendar/${eventId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        loadEvents();
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`);
  });

  return (
    <div className="calendar-tab">
      <h2>📅 Calendar</h2>

      {/* Add Event Form */}
      <form className="add-event-form" onSubmit={handleAddEvent}>
        <input
          type="text"
          placeholder="Event title..."
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          className="event-input"
        />
        <input
          type="date"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          className="date-input"
        />
        <input
          type="time"
          value={newEvent.time}
          onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
          className="time-input"
        />
        <button type="submit" className="add-btn">
          Add Event
        </button>
      </form>

      {/* Events List */}
      <div className="events-list">
        <h3>Upcoming Events</h3>
        {loading ? (
          <p>Loading...</p>
        ) : sortedEvents.length === 0 ? (
          <p className="empty">No events scheduled.</p>
        ) : (
          sortedEvents.map((event) => (
            <div
              key={event.id}
              className={`event-item ${event.date === today ? 'today' : event.date < today ? 'past' : ''}`}
            >
              <div className="event-date">
                <span className="day">{new Date(event.date).toLocaleDateString('en-US', { day: '2-digit' })}</span>
                <span className="month">{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
              <div className="event-content">
                <h4>{event.title}</h4>
                {event.time && <p className="event-time">⏰ {event.time}</p>}
                {event.attendees && event.attendees.length > 0 && (
                  <p className="event-attendees">👥 {event.attendees.join(', ')}</p>
                )}
              </div>
              <button
                className="delete-btn"
                onClick={() => handleDeleteEvent(event.id)}
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

export default CalendarTab;
