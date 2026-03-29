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
  let priority = 'medium';
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

  // Extract date (comprehensive patterns)
  let date = null;
  
  // Helper function to format date as YYYY-MM-DD
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  // Relative dates
  if (lower.includes('today')) {
    date = formatDate(new Date());
  } else if (lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = formatDate(d);
  } else if (lower.includes('next week')) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    date = formatDate(d);
  } else if (lower.includes('next month')) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    date = formatDate(d);
  } else {
    // Day of week patterns (next Monday, Friday, etc.)
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayMatches = transcript.match(/(?:next\s+)?(\w+day)/i);
    
    if (dayMatches) {
      const dayName = dayMatches[1].toLowerCase();
      const dayIndex = daysOfWeek.indexOf(dayName);
      
      if (dayIndex !== -1) {
        const d = new Date();
        const currentDay = d.getDay();
        let daysUntil = dayIndex - currentDay;
        
        // If day is today or in the past, get next week's occurrence
        if (lower.includes('next') || daysUntil <= 0) {
          daysUntil += 7;
        }
        
        d.setDate(d.getDate() + daysUntil);
        date = formatDate(d);
      }
    }
    
    // Absolute date patterns: March 30, 30/3, 3/30, etc.
    // Pattern: Month Day (e.g., "March 30", "March 30th")
    const monthDayMatch = transcript.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (monthDayMatch) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const month = monthNames.indexOf(monthDayMatch[1].toLowerCase()) + 1;
      const day = parseInt(monthDayMatch[2]);
      const year = new Date().getFullYear();
      const dateObj = new Date(year, month - 1, day);
      
      // If date is in the past this year, try next year
      if (dateObj < new Date()) {
        dateObj.setFullYear(year + 1);
      }
      
      date = formatDate(dateObj);
    }
    
    // Pattern: DD/MM or MM/DD or DD.MM or MM.DD
    if (!date) {
      const slashMatch = transcript.match(/\b(\d{1,2})[\/.\/](\d{1,2})\b/);
      if (slashMatch) {
        let day = parseInt(slashMatch[1]);
        let month = parseInt(slashMatch[2]);
        
        // Guess format: if first number > 12, assume DD/MM
        if (day > 12) {
          [day, month] = [month, day];
        }
        
        const year = new Date().getFullYear();
        const dateObj = new Date(year, month - 1, day);
        
        // If date is in the past this year, try next year
        if (dateObj < new Date()) {
          dateObj.setFullYear(year + 1);
        }
        
        date = formatDate(dateObj);
      }
    }
    
    // Pattern: full date YYYY-MM-DD or DD-MM-YYYY
    if (!date) {
      const fullMatch = transcript.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})-(\d{1,2})-(\d{4})\b/);
      if (fullMatch) {
        if (fullMatch[1]) {
          // YYYY-MM-DD format
          date = `${fullMatch[1]}-${String(fullMatch[2]).padStart(2, '0')}-${String(fullMatch[3]).padStart(2, '0')}`;
        } else {
          // DD-MM-YYYY format
          date = `${fullMatch[6]}-${String(fullMatch[5]).padStart(2, '0')}-${String(fullMatch[4]).padStart(2, '0')}`;
        }
      }
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
