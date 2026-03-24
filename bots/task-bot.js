#!/usr/bin/env node
/**
 * Task Bot
 * 
 * Purpose: Manage tasks with due dates, priorities, and status
 * Storage: JSON file with task array
 * Interface: add-task, list-tasks, complete-task, delete-task
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/bot-config.json'),
  'utf8'
));

const TASKS_FILE = CONFIG.storage.tasksFile;

// Initialize tasks file if it doesn't exist
function initTasks() {
  if (!fs.existsSync(TASKS_FILE)) {
    const initialTasks = { tasks: [], lastUpdated: new Date().toISOString() };
    fs.writeFileSync(TASKS_FILE, JSON.stringify(initialTasks, null, 2), 'utf8');
  }
}

initTasks();

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Task Bot] ${message}`);
  fs.appendFileSync(
    CONFIG.logging.file,
    `[${timestamp}] [Task Bot] ${message}\n`
  );
}

/**
 * Load tasks from file
 */
function loadTasks() {
  try {
    const content = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`⚠️  Error loading tasks: ${error.message}`);
    return { tasks: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save tasks to file
 */
function saveTasks(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf8');
    log(`✅ Tasks saved (${data.tasks.length} tasks)`);
  } catch (error) {
    log(`❌ Error saving tasks: ${error.message}`);
  }
}

/**
 * Add a task
 */
function addTask(text, due = null, priority = 'medium', tags = []) {
  try {
    const tasks = loadTasks();
    const taskId = crypto.randomBytes(6).toString('hex');
    
    const newTask = {
      id: taskId,
      text: text,
      created: new Date().toISOString(),
      due: due || null,
      priority: priority, // high, medium, low
      status: 'pending', // pending, in-progress, done
      tags: tags
    };
    
    tasks.tasks.push(newTask);
    saveTasks(tasks);
    
    log(`✅ Task added: "${text}" (priority: ${priority})`);
    return { success: true, taskId, task: newTask };
  } catch (error) {
    log(`❌ Error adding task: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * List tasks with filters
 */
function listTasks(filters = {}) {
  try {
    const tasks = loadTasks();
    let filtered = tasks.tasks;
    
    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    
    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }
    
    // Filter by due date
    if (filters.due) {
      filtered = filtered.filter(t => t.due === filters.due);
    }
    
    // Sort by priority (high → medium → low) and due date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31');
    });
    
    log(`✅ Listed ${filtered.length} tasks`);
    return { success: true, tasks: filtered, filters };
  } catch (error) {
    log(`❌ Error listing tasks: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Complete a task
 */
function completeTask(taskId) {
  try {
    const tasks = loadTasks();
    const task = tasks.tasks.find(t => t.id === taskId);
    
    if (!task) {
      log(`⚠️  Task not found: ${taskId}`);
      return { success: false, error: 'Task not found' };
    }
    
    task.status = 'done';
    saveTasks(tasks);
    
    log(`✅ Task completed: "${task.text}"`);
    return { success: true, task };
  } catch (error) {
    log(`❌ Error completing task: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a task
 */
function deleteTask(taskId) {
  try {
    const tasks = loadTasks();
    const index = tasks.tasks.findIndex(t => t.id === taskId);
    
    if (index === -1) {
      log(`⚠️  Task not found: ${taskId}`);
      return { success: false, error: 'Task not found' };
    }
    
    const deleted = tasks.tasks[index];
    tasks.tasks.splice(index, 1);
    saveTasks(tasks);
    
    log(`✅ Task deleted: "${deleted.text}"`);
    return { success: true, task: deleted };
  } catch (error) {
    log(`❌ Error deleting task: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending tasks for today/overdue
 */
function getPending() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = loadTasks();
    
    const pending = tasks.tasks.filter(t => 
      t.status === 'pending' && 
      (!t.due || t.due <= today)
    ).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    log(`✅ Retrieved ${pending.length} pending/overdue tasks`);
    return { success: true, tasks: pending, today };
  } catch (error) {
    log(`❌ Error getting pending tasks: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🤖 Task Bot started');
  
  if (command === 'add' && args[1]) {
    const text = args.slice(1).join(' ');
    addTask(text);
  } else if (command === 'list') {
    const filters = {};
    if (args[1] === '--status' && args[2]) filters.status = args[2];
    if (args[1] === '--priority' && args[2]) filters.priority = args[2];
    listTasks(filters);
  } else if (command === 'complete' && args[1]) {
    completeTask(args[1]);
  } else if (command === 'delete' && args[1]) {
    deleteTask(args[1]);
  } else if (command === 'pending') {
    getPending();
  } else {
    console.log(`
Task Bot — CLI Interface

Commands:
  add <text>              Add a task
  list [--status pending] List tasks
  complete <taskId>       Mark task done
  delete <taskId>         Delete a task
  pending                 Show pending/overdue

Examples:
  node task-bot.js add "Follow up with FrontDesk"
  node task-bot.js list --status pending
  node task-bot.js pending
    `);
  }
}

module.exports = {
  addTask,
  listTasks,
  completeTask,
  deleteTask,
  getPending,
  loadTasks,
  saveTasks
};
