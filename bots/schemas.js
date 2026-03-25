/**
 * MongoDB Schemas
 */

const mongoose = require('mongoose');

// Task Schema
const taskSchema = new mongoose.Schema({
  id: String,
  text: String,
  created: Date,
  due: String,
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'done'], default: 'pending' },
  tags: [String]
});

// Calendar Event Schema
const eventSchema = new mongoose.Schema({
  id: String,
  title: String,
  date: String,
  time: String,
  duration: Number,
  attendees: [String],
  notes: String,
  created: Date
});

// Note Schema
const noteSchema = new mongoose.Schema({
  id: String,
  date: String,
  filename: String,
  text: String,
  tags: [String],
  created: Date
});

// Create models
const Task = mongoose.model('Task', taskSchema);
const Event = mongoose.model('Event', eventSchema);
const Note = mongoose.model('Note', noteSchema);

module.exports = {
  Task,
  Event,
  Note
};
