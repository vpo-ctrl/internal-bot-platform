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
  processTranscript
};
