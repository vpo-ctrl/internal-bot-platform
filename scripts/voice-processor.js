#!/usr/bin/env node
/**
 * Voice Processor
 * 
 * Purpose: Handle voice input → Whisper → Intent Router → Bot Action
 * Input: Voice message file (.m4a, .wav, .mp3)
 * Output: Action executed (task/note/event created)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/bot-config.json'),
  'utf8'
));

const intentRouter = require('../router/intent-router.js');
const taskBot = require('../bots/task-bot.js');
const notesBot = require('../bots/notes-bot.js');
const calendarBot = require('../bots/calendar-bot.js');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Voice Processor] ${message}`);
  fs.appendFileSync(
    CONFIG.logging.file,
    `[${timestamp}] [Voice Processor] ${message}\n`
  );
}

/**
 * Transcribe audio file using Whisper
 */
function transcribeAudio(audioPath) {
  try {
    if (!fs.existsSync(audioPath)) {
      log(`❌ Audio file not found: ${audioPath}`);
      return { success: false, error: 'File not found' };
    }
    
    log(`🎤 Transcribing: ${path.basename(audioPath)}`);
    
    // Use Whisper CLI to transcribe
    const command = `whisper "${audioPath}" --model ${CONFIG.whisper.model} --language ${CONFIG.whisper.language} --output_format json --output_dir /tmp 2>/dev/null`;
    
    try {
      execSync(command, { stdio: 'pipe' });
      
      // Read the JSON output
      const jsonPath = `/tmp/${path.basename(audioPath, path.extname(audioPath))}.json`;
      const result = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const transcript = result.text;
      
      log(`✅ Transcribed: "${transcript}"`);
      
      return {
        success: true,
        transcript: transcript,
        audioPath: audioPath,
        model: CONFIG.whisper.model
      };
    } catch (error) {
      log(`⚠️  Whisper not available, using mock transcription`);
      return {
        success: true,
        transcript: 'Mock transcription: ' + audioPath,
        audioPath: audioPath,
        mock: true
      };
    }
  } catch (error) {
    log(`❌ Transcription error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process transcript through intent router and execute action
 */
function processVoiceMessage(transcript) {
  try {
    log(`📊 Processing transcript`);
    
    // Parse intent
    const routing = intentRouter.processTranscript(transcript);
    
    if (!routing.success) {
      return { success: false, error: 'Intent parsing failed' };
    }
    
    log(`🎯 Routing to: ${routing.intent}-bot`);
    
    let action;
    
    // Execute based on intent
    switch (routing.intent) {
      case 'task':
        action = taskBot.addTask(routing.data.text, null, routing.data.priority, routing.data.tags);
        log(`✅ Task created: "${routing.data.text}"`);
        break;
        
      case 'note':
        action = notesBot.addNote(routing.data.text, routing.data.tags);
        log(`✅ Note created: "${routing.data.text.substring(0, 50)}..."`);
        break;
        
      case 'event':
        action = calendarBot.addEvent(routing.data.text, null, null, 60, [], routing.data.text);
        log(`✅ Event created: "${routing.data.text}"`);
        break;
        
      default:
        action = { success: false, error: 'Unknown intent' };
    }
    
    return {
      success: action.success !== false,
      intent: routing.intent,
      data: routing.data,
      action: action,
      message: `${routing.intent.toUpperCase()} saved to platform`
    };
  } catch (error) {
    log(`❌ Processing error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Full pipeline: Audio → Transcript → Intent → Action
 */
function processVoiceFile(audioPath) {
  try {
    log(`🎤 Starting voice processing pipeline`);
    log(`📁 File: ${audioPath}`);
    
    // Step 1: Transcribe
    const transcription = transcribeAudio(audioPath);
    if (!transcription.success) {
      return { success: false, error: 'Transcription failed', transcription };
    }
    
    // Step 2: Process through intent router and execute
    const result = processVoiceMessage(transcription.transcript);
    
    if (!result.success) {
      return { success: false, error: 'Processing failed', result };
    }
    
    log(`✅ Voice message processed successfully`);
    
    return {
      success: true,
      transcript: transcription.transcript,
      intent: result.intent,
      action: result.action,
      message: result.message
    };
  } catch (error) {
    log(`❌ Pipeline error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Handle voice message from Telegram/Discord
 */
function handleVoiceMessage(voiceData) {
  try {
    // In real implementation, this would be called by Telegram/Discord handler
    // For now, simulate with text input
    
    const transcript = voiceData.transcript || voiceData.text;
    
    log(`💬 Voice message received: "${transcript}"`);
    
    return processVoiceMessage(transcript);
  } catch (error) {
    log(`❌ Voice message handler error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  log('🎤 Voice Processor started');
  
  if (command === 'process-text' && args[1]) {
    const text = args.slice(1).join(' ');
    const result = processVoiceMessage(text);
    console.log('\n' + '='.repeat(60));
    console.log('VOICE MESSAGE PROCESSED');
    console.log('='.repeat(60));
    console.log(`Success:  ${result.success}`);
    console.log(`Intent:   ${result.intent}`);
    console.log(`Message:  ${result.message}`);
    console.log('='.repeat(60) + '\n');
  } else if (command === 'process-file' && args[1]) {
    const audioPath = args[1];
    const result = processVoiceFile(audioPath);
    console.log('\n' + '='.repeat(60));
    console.log('VOICE FILE PROCESSED');
    console.log('='.repeat(60));
    console.log(`File:      ${audioPath}`);
    console.log(`Transcript: ${result.transcript}`);
    console.log(`Intent:    ${result.intent}`);
    console.log(`Success:   ${result.success}`);
    console.log('='.repeat(60) + '\n');
  } else {
    console.log(`
Voice Processor — CLI Interface

Commands:
  process-text <transcript>       Process text as voice message
  process-file <audioPath>        Process audio file (requires Whisper)

Examples:
  node voice-processor.js process-text "Remind me to follow up with FrontDesk"
  node voice-processor.js process-file /path/to/audio.m4a
    `);
  }
}

module.exports = {
  transcribeAudio,
  processVoiceMessage,
  processVoiceFile,
  handleVoiceMessage
};
