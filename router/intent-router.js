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

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

const NOTE_KEYWORDS = [
  'note', 'remember', 'save', 'memo',
  'הערה', 'פתק', 'רשום', 'תרשום', 'תרשמי', 'תכתוב', 'תכתבי', 'שמור', 'תשמור', 'לזכור'
];

const EXPLICIT_EVENT_KEYWORDS = [
  'event', 'schedule', 'meeting', 'calendar', 'appointment',
  'פגישה', 'פגישת', 'ישיבה', 'זום', 'יומן', 'פגישה עם'
];

const EVENT_SCHEDULING_CUES = [
  'היום', 'מחר', 'מחרתיים', 'שבוע הבא', 'חודש הבא', 'בשעה', 'ביום'
];

const TASK_KEYWORDS = [
  'task', 'todo', 'buy', 'call', 'follow up', 'need to',
  'משימה', 'צריך', 'צריכה', 'לעשות', 'לטפל', 'להתקשר', 'לקנות', 'לשלוח', 'לבדוק', 'לעקוב'
];

const HEBREW_WEEKDAYS = [
  { patterns: ['יום ראשון', 'ראשון'], index: 0 },
  { patterns: ['יום שני', 'שני'], index: 1 },
  { patterns: ['יום שלישי', 'שלישי'], index: 2 },
  { patterns: ['יום רביעי', 'רביעי'], index: 3 },
  { patterns: ['יום חמישי', 'חמישי'], index: 4 },
  { patterns: ['יום שישי', 'שישי'], index: 5 },
  { patterns: ['שבת', 'יום שבת'], index: 6 }
];

/**
 * Parse voice intent with full structured output
 */
function parseVoiceIntent(transcript) {
  const lower = transcript.toLowerCase();
  const hasNoteKeyword = includesAny(lower, NOTE_KEYWORDS);
  const hasExplicitEventKeyword = includesAny(lower, EXPLICIT_EVENT_KEYWORDS);
  const hasTaskKeyword = includesAny(lower, TASK_KEYWORDS);
  const hasSchedulingCue = includesAny(lower, EVENT_SCHEDULING_CUES) || /\d{1,2}(?:am|pm|:)/i.test(transcript);
  
  // Determine type (task, note, event)
  let type = 'task'; // default
  if (hasNoteKeyword) {
    type = 'note';
  } else if (hasExplicitEventKeyword || (!hasTaskKeyword && hasSchedulingCue)) {
    type = 'event';
  } else if (hasTaskKeyword) {
    type = 'task';
  }

  // Extract action
  let action = 'create';
  if (lower.includes('complete') || lower.includes('done') || lower.includes('finished') || lower.includes('סיימתי') || lower.includes('בוצע') || lower.includes('הושלם')) {
    action = 'complete';
  } else if (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel') || lower.includes('מחק') || lower.includes('בטל')) {
    action = 'delete';
  }

  // Extract priority
  let priority = 'medium';
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('important') || lower.includes('דחוף') || lower.includes('חשוב')) {
    priority = 'high';
  } else if (lower.includes('low') || lower.includes('whenever') || lower.includes('לא דחוף') || lower.includes('כשיהיה זמן')) {
    priority = 'low';
  }

  // Extract tags
  const tags = [];
  if (lower.includes('work') || lower.includes('office')) tags.push('work');
  if (lower.includes('personal') || lower.includes('home')) tags.push('personal');
  if (lower.includes('urgent')) tags.push('urgent');
  if (lower.includes('עבודה') || lower.includes('משרד')) tags.push('work');
  if (lower.includes('בית') || lower.includes('אישי')) tags.push('personal');
  if (lower.includes('דחוף')) tags.push('urgent');

  // Extract title (first 50 chars or full text)
  let title = transcript.replace(/^(task|note|event|remember|schedule|remind me|הערה|משימה|פגישה|תזכיר לי|תרשום|תרשמי|תכתוב|תכתבי)\s+/i, '').trim();
  title = title.replace(/^(to|that|about|me|עם)\s+/i, '').trim();
  if (title.length > 100) {
    title = title.substring(0, 100) + '...';
  }

  // Extract date (comprehensive patterns)
  let date = null;

  // Relative dates
  if (lower.includes('today') || lower.includes('היום')) {
    date = formatDate(new Date());
  } else if (lower.includes('tomorrow') || lower.includes('מחר')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = formatDate(d);
  } else if (lower.includes('מחרתיים')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    date = formatDate(d);
  } else if (lower.includes('next week') || lower.includes('שבוע הבא')) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    date = formatDate(d);
  } else if (lower.includes('next month') || lower.includes('חודש הבא')) {
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

    if (!date) {
      const matchedHebrewDay = HEBREW_WEEKDAYS.find(({ patterns }) => includesAny(lower, patterns));
      if (matchedHebrewDay) {
        const d = new Date();
        const currentDay = d.getDay();
        let daysUntil = matchedHebrewDay.index - currentDay;

        if (lower.includes('הבא') || daysUntil <= 0) {
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
