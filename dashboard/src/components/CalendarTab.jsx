import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/CalendarTab.css';

function CalendarTab({ token, apiUrl }) {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  });
  const [editingId, setEditingId] = useState(null);
  const [editEvent, setEditEvent] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

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

  const handleStartEdit = (event) => {
    setEditingId(event.id);
    setEditEvent({ ...event });
  };

  const handleSaveEdit = async (eventId) => {
    try {
      await axios.patch(
        `${apiUrl}/api/calendar/${eventId}`,
        {
          date: editEvent.date,
          time: editEvent.time
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      loadEvents();
    } catch (err) {
      console.error('Error updating event:', err);
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

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekDays = (date) => {
    const start = getWeekStart(date);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const monthDays = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => 
    new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const firstDayOffset = getFirstDayOfMonth(currentDate);
  const monthCalendarDays = [
    ...Array(firstDayOffset).fill(null),
    ...monthDays
  ];

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
        <button type="submit" className="add-btn">Add Event</button>
      </form>

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          className={`view-btn ${view === 'week' ? 'active' : ''}`}
          onClick={() => setView('week')}
        >
          📅 Week
        </button>
        <button
          className={`view-btn ${view === 'month' ? 'active' : ''}`}
          onClick={() => setView('month')}
        >
          📆 Month
        </button>
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div className="week-view">
          <div className="week-header">
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}>
              ← Prev
            </button>
            <h3>
              {getWeekStart(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(getWeekStart(currentDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </h3>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}>
              Next →
            </button>
          </div>
          
          <div className="week-grid">
            {getWeekDays(currentDate).map((day) => {
              const dayEvents = getEventsForDate(day);
              const isToday = day.toISOString().split('T')[0] === today;
              
              return (
                <div key={day.toISOString()} className={`day-cell ${isToday ? 'today' : ''}`}>
                  <div className="day-header">
                    <div className="day-name">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="day-date">{day.getDate()}</div>
                  </div>
                  <div className="day-events">
                    {dayEvents.map(e => (
                      <div key={e.id} className="day-event">
                        <span className="event-time">{e.time}</span>
                        <span className="event-title">{e.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {view === 'month' && (
        <div className="month-view">
          <div className="month-header">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
              ← Prev
            </button>
            <h3>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
              Next →
            </button>
          </div>

          <div className="month-calendar">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="day-name-header">{day}</div>
            ))}

            {monthCalendarDays.map((day, idx) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day && day.toISOString().split('T')[0] === today;
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={idx}
                  className={`month-day ${day ? 'has-date' : 'empty'} ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                >
                  {day && (
                    <>
                      <div className="day-number">{day.getDate()}</div>
                      <div className="month-day-events">
                        {dayEvents.slice(0, 2).map(e => (
                          <div key={e.id} className="month-event" title={e.title}>
                            {e.time && <span className="event-time">{e.time}</span>}
                            <span className="event-title">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && <div className="more-events">+{dayEvents.length - 2}</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="events-list">
        <h3>📋 Upcoming Events</h3>
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
                {editingId === event.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editEvent.title}
                      onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                      className="edit-title"
                    />
                    <input
                      type="date"
                      value={editEvent.date}
                      onChange={(e) => setEditEvent({ ...editEvent, date: e.target.value })}
                      className="edit-date"
                    />
                    <input
                      type="time"
                      value={editEvent.time}
                      onChange={(e) => setEditEvent({ ...editEvent, time: e.target.value })}
                      className="edit-time"
                    />
                    <button onClick={() => handleSaveEdit(event.id)} className="save-btn">Save</button>
                    <button onClick={() => setEditingId(null)} className="cancel-btn">Cancel</button>
                  </div>
                ) : (
                  <>
                    <h4>{event.title}</h4>
                    {event.time && <p className="event-time">⏰ {event.time}</p>}
                    {event.notes && <p className="event-notes">📝 {event.notes}</p>}
                  </>
                )}
              </div>
              {editingId !== event.id && (
                <div className="event-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleStartEdit(event)}
                    title="Edit event"
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteEvent(event.id)}
                    title="Delete event"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CalendarTab;
