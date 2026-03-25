import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/TasksTab.css';

function TasksTab({ token, apiUrl }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState({ text: '', priority: 'medium', due: '' });
  const [editingId, setEditingId] = useState(null);
  const [editTask, setEditTask] = useState({});

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data.tasks || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.text.trim()) return;

    try {
      await axios.post(
        `${apiUrl}/api/tasks`,
        {
          text: newTask.text,
          priority: newTask.priority,
          due: newTask.due || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTask({ text: '', priority: 'medium', due: '' });
      loadTasks();
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditTask({ ...task });
  };

  const handleSaveEdit = async (taskId) => {
    try {
      await axios.patch(
        `${apiUrl}/api/tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      loadTasks();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await axios.patch(
        `${apiUrl}/api/tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadTasks();
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await axios.delete(
          `${apiUrl}/api/tasks/${taskId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        loadTasks();
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  return (
    <div className="tasks-tab">
      <h2>✅ Tasks</h2>

      {/* Add Task Form */}
      <form className="add-task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask.text}
          onChange={(e) => setNewTask({ ...newTask, text: e.target.value })}
          className="task-input"
        />
        <select
          value={newTask.priority}
          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
          className="priority-select"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          type="date"
          value={newTask.due}
          onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
          className="due-date"
        />
        <button type="submit" className="add-btn">Add Task</button>
      </form>

      {/* Tasks List */}
      <div className="tasks-list">
        {loading ? (
          <p className="loading">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="empty">No tasks yet. Create one above! 🎯</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}
            >
              <div className="task-content">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={() => handleCompleteTask(task.id)}
                  className="task-checkbox"
                />
                <div className="task-details">
                  <h4>{task.text}</h4>
                  <div className="task-meta">
                    <span className={`priority priority-${task.priority}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    {task.due && (
                      <span className="due-date-badge">
                        📅 {new Date(task.due).toLocaleDateString()}
                      </span>
                    )}
                    <span className="status">{task.status}</span>
                  </div>
                </div>
              </div>
              <div className="task-actions">
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteTask(task.id)}
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TasksTab;
