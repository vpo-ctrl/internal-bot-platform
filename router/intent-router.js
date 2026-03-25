#!/usr/bin/env node
/**
 * Intent Router
 * 
 * Purpose: Parse voice transcripts and route to appropriate bot
 * Input: Raw text from Whisper
 * Output: Structured command + routing decision
 */

const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/bot-config.json'),
  'utf8'
));

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Intent Router] ${message}`);
  fs.appendFileSync(
    CONFIG.logging.file,
    `[${timestamp}] [Intent Router] ${message}\n`
  );
}

/**
 * Parse voice intent with full structured output
 */
function parseVoiceIntent(transcript) {
  const lower = transcript.toLowerCase();
  
  // Determine type (task, note, event)
  let type = 'task'; // default
  if (lower.includes('note') || lower.includes('remember') || lower.includes('save')) {
    type = 'note';
  } else if (lower.includes('event') || lower.includes('schedule') || lower.includes('meeting') || lower.includes('tomorrow') || lower.includes('next') || lower.includes('o\'clock') || /\d{1,2}(?:am|pm|:)/i.test(transcript)) {
    type = 'event';
  } else if (lower.includes('task') || lower.includes('todo') || lower.includes('do') || lower.includes('buy') || lower.includes('call')) {
    type = 'task';
  }

  // Extract action
  let action = 'create';
  if (lower.includes('complete') || lower.includes('done') || lower.includes('finished')) {
    action = 'complete';
  } else if (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel')) {
    action = 'delete';
  }

  // Extract priority
  let priority = 'normal';
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('important')) {
    priority = 'high';
  } else if (lower.includes('low') || lower.includes('whenever')) {
    priority = 'low';
  }

  // Extract tags
  const tags = [];
  if (lower.includes('work') || lower.includes('office')) tags.push('work');
  if (lower.includes('personal') || lower.includes('home')) tags.push('personal');
  if (lower.includes('urgent')) tags.push('urgent');

  // Extract title (first 50 chars or full text)
  let title = transcript.replace(/^(task|note|event|remember|schedule|remind me)\s+/i, '').trim();
  title = title.replace(/^(to|that|about|me)\s+/i, '').trim();
  if (title.length > 100) {
    title = title.substring(0, 100) + '...';
  }

  // Extract date (simple patterns)
  let date = null;
  const datePatterns = {
    'today': () => new Date().toISOString().split('T')[0],
    'tomorrow': () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    },
    'next week': () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    }
  };
  
  for (const [pattern, fn] of Object.entries(datePatterns)) {
    if (lower.includes(pattern)) {
      date = fn();
      break;
    }
  }

  // Extract time (simple patterns)
  let time = null;
  const timeMatch = transcript.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
    const finalHour = ampm === 'pm' && hour !== 12 ? hour + 12 : (ampm === 'am' && hour === 12 ? 0 : hour);
    time = `${String(finalHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return {
    type,
    action,
    title,
    description: transcript,
    tags,
    date,
    time,
    priority,
    confidence: 0.8 // voice has inherent uncertainty
  };
}

/**
 * Detect intent from transcript using heuristics
 */
function detectIntent(transcript) {
  const text = transcript.toLowerCase();
  
  // Task patterns
  const taskPatterns = [
    /^remind ?(me|you)? (to |of )?/,
    /^(i need to|you need to|need to) /,
    /^(follow up|check) /,
    /^(call|contact|email|message) /,
    /don't forget/,
    /make sure/
  ];
  
  // Event/Meeting patterns
  const eventPatterns = [
    /schedule.*meeting/,
    /meeting.*with/,
    /at \d{1,2}:?\d{2}(am|pm)?/,
    /thursday|friday|monday|tuesday|wednesday/,
    /(this|next) (week|monday|tuesday|wednesday|thursday|friday)/
  ];
  
  // Note patterns
  const notePatterns = [
    /^(note:|cinema:|occupancy:|update:)/,
    /(is up|is down|increased|decreased)/,
    /work status|observed|noticed|saw/
  ];
  
  let intent = {
    type: 'note',
    confidence: 0.5,
    text: transcript,
    tags: []
  };
  
  // Check for task
  if (taskPatterns.some(p => p.test(text))) {
    intent = {
      type: 'task',
      confidence: 0.9,
      text: transcript,
      priority: text.includes('urgent') || text.includes('important') ? 'high' : 'medium',
      tags: extractTags(text)
    };
  }
  // Check for event
  else if (eventPatterns.some(p => p.test(text))) {
    intent = {
      type: 'event',
      confidence: 0.85,
      text: transcript,
      tags: extractTags(text)
    };
  }
  // Check for note
  else if (notePatterns.some(p => p.test(text))) {
    intent = {
      type: 'note',
      confidence: 0.8,
      text: transcript,
      tags: extractTags(text)
    };
  }
  
  return intent;
}

/**
 * Extract tags from transcript
 */
function extractTags(text) {
  const tagKeywords = {
    'cinema': ['cinema', 'hostel', 'occupancy', 'workers'],
    'frontdesk': ['frontdesk', 'desk', 'reception'],
    'operations': ['operations', 'operational'],
    'urgent': ['urgent', 'asap', 'immediately', 'important']
  };
  
  const tags = [];
  const lowerText = text.toLowerCase();
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(k => lowerText.includes(k))) {
      tags.push(tag);
    }
  }
  
  return tags.length > 0 ? tags : ['general'];
}

/**
 * Process transcript end-to-end
 */
function processTranscript(transcript) {
  log(`📝 Parsing: "${transcript}"`);
  
  const intent = detectIntent(transcript);
  
  log(`✅ Intent: ${intent.type} (confidence: ${intent.confidence})`);
  
  return {
    success: true,
    original: transcript,
    intent: intent.type,
    confidence: intent.confidence,
    data: {
      text: intent.text,
      priority: intent.priority || 'medium',
      tags: intent.tags
    },
    suggestedAction: `Route to ${intent.type}-bot`
  };
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🤖 Intent Router started');
  
  if (command === 'parse' && args[1]) {
    const transcript = args.slice(1).join(' ');
    const result = processTranscript(transcript);
    console.log('\n' + '='.repeat(60));
    console.log('INTENT PARSING RESULT');
    console.log('='.repeat(60));
    console.log(`Original:  "${result.original}"`);
    console.log(`Intent:    ${result.intent.toUpperCase()}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`Tags:      ${result.data.tags.join(', ')}`);
    console.log(`Priority:  ${result.data.priority}`);
    console.log(`Action:    ${result.suggestedAction}`);
    console.log('='.repeat(60) + '\n');
  } else {
    console.log(`
Intent Router — CLI Interface

Commands:
  parse <transcript>      Parse voice transcript and route

Examples:
  node intent-router.js parse "Remind me to follow up with FrontDesk"
  node intent-router.js parse "Schedule a meeting with the team Thursday at 2 PM"
  node intent-router.js parse "Cinema occupancy is up 5%"
    `);
  }
}

module.exports = {
  detectIntent,
  extractTags,
  processTranscript,
  parseVoiceIntent
};
