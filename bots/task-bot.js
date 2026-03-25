#!/usr/bin/env node
/**
 * Task Bot - MongoDB Version
 * 
 * Purpose: Manage tasks with due dates, priorities, and status
 * Storage: MongoDB (persistent cloud database)
 * Interface: add-task, list-tasks, complete-task, delete-task
 */

const crypto = require('crypto');
const { connectDB } = require('./db-connection');
const { Task } = require('./schemas');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Task Bot] ${message}`);
}

/**
 * Add a task
 */
async function addTask(text, due = null, priority = 'medium', tags = []) {
  try {
    await connectDB();

    const taskId = crypto.randomBytes(6).toString('hex');

    const newTask = new Task({
      id: taskId,
      text: text,
      created: new Date(),
      due: due || null,
      priority: priority,
      status: 'pending',
      tags: tags
    });

    await newTask.save();

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
async function listTasks(filters = {}) {
  try {
    await connectDB();

    let query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    const tasks = await Task.find(query).sort({
      priority: -1,
      due: 1
    });

    log(`✅ Listed ${tasks.length} tasks`);
    return { success: true, tasks, filters };
  } catch (error) {
    log(`❌ Error listing tasks: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Complete a task
 */
async function completeTask(taskId) {
  try {
    await connectDB();

    const task = await Task.findOneAndUpdate(
      { id: taskId },
      { status: 'done' },
      { new: true }
    );

    if (!task) {
      log(`⚠️ Task not found: ${taskId}`);
      return { success: false, error: 'Task not found' };
    }

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
async function deleteTask(taskId) {
  try {
    await connectDB();

    const task = await Task.findOneAndDelete({ id: taskId });

    if (!task) {
      log(`⚠️ Task not found: ${taskId}`);
      return { success: false, error: 'Task not found' };
    }

    log(`✅ Task deleted: "${task.text}"`);
    return { success: true, task };
  } catch (error) {
    log(`❌ Error deleting task: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending tasks
 */
async function getPending() {
  try {
    await connectDB();

    const today = new Date().toISOString().split('T')[0];

    const tasks = await Task.find({
      status: 'pending',
      $or: [
        { due: { $lte: today } },
        { due: null }
      ]
    }).sort({ priority: -1 });

    log(`✅ Retrieved ${tasks.length} pending/overdue tasks`);
    return { success: true, tasks, today };
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

  (async () => {
    try {
      if (command === 'add' && args[1]) {
        const text = args.slice(1).join(' ');
        const result = await addTask(text);
        console.log('\n✅ Task added:', result.task);
      } else if (command === 'list') {
        const filters = {};
        if (args[1] === '--status' && args[2]) filters.status = args[2];
        if (args[1] === '--priority' && args[2]) filters.priority = args[2];
        const result = await listTasks(filters);
        console.log('\n✅ Tasks:', result.tasks);
      } else if (command === 'complete' && args[1]) {
        const result = await completeTask(args[1]);
        console.log('\n✅ Result:', result.task);
      } else if (command === 'delete' && args[1]) {
        const result = await deleteTask(args[1]);
        console.log('\n✅ Deleted:', result.task);
      } else if (command === 'pending') {
        const result = await getPending();
        console.log('\n✅ Pending tasks:', result.tasks);
      } else {
        console.log(`
Task Bot — MongoDB CLI Interface

Commands:
  add <text>              Add a task
  list [--status pending] List tasks
  complete <taskId>       Mark task done
  delete <taskId>         Delete a task
  pending                 Show pending/overdue
        `);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  })();
}

module.exports = {
  addTask,
  listTasks,
  completeTask,
  deleteTask,
  getPending
};
