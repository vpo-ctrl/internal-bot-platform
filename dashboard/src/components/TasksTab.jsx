import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/TasksTab.css';

function TasksTab({ token, apiUrl }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filterStatus, setFilterStatus] = useState('pending');

  useEffect(() => {
    loadTasks();
  }, [filterStatus]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/api/tasks`, {
        params: { status: filterStatus },
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
    if (!newTask.trim()) return;

    try {
      await axios.post(
        `${apiUrl}/api/tasks`,
        { text: newTask, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTask('');
      setPriority('medium');
      loadTasks();
    } catch (err) {
      console.error('Error adding task:', err);
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

  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

  return (
    <div className="tasks-tab">
      <h2>✅ Task Manager</h2>

      {/* Add Task Form */}
      <form className="add-task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          placeholder="Add a new task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="task-input"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="priority-select"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button type="submit" className="add-btn">
          Add Task
        </button>
      </form>

      {/* Filter */}
      <div className="filter-buttons">
        <button
          className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-btn ${filterStatus === 'done' ? 'active' : ''}`}
          onClick={() => setFilterStatus('done')}
        >
          Done
        </button>
      </div>

      {/* Tasks List */}
      <div className="tasks-list">
        {loading ? (
          <p>Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="empty">No tasks yet!</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`task-item ${task.status}`}>
              <div className="task-left">
                <button
                  className="checkbox"
                  onClick={() => handleCompleteTask(task.id)}
                >
                  {task.status === 'done' ? '✅' : '⬜'}
                </button>
                <div className="task-content">
                  <p className="task-text">{task.text}</p>
                  {task.due && <p className="task-due">Due: {task.due}</p>}
                </div>
              </div>
              <div className="task-right">
                <span className="priority-badge">{priorityEmoji[task.priority]}</span>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteTask(task.id)}
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
