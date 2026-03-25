/**
 * Voice Processor Bot
 * 
 * Transcribes audio via Whisper
 * Routes to tasks/notes/calendar based on intent
 * Creates data via API calls
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Intent router
const intentRouter = require('../router/intent-router.js');

class VoiceProcessor {
  constructor(apiUrl, authToken) {
    this.apiUrl = apiUrl || 'http://localhost:3000';
    this.authToken = authToken;
    this.whisperModel = 'base'; // base, small, medium, large
  }

  /**
   * Process voice message: download → transcribe → route → create
   */
  async processVoiceMessage(telegramFileId, telegramBotToken) {
    try {
      console.log(`🎙️ Processing voice message: ${telegramFileId}`);

      // Step 1: Download audio from Telegram
      const audioPath = await this.downloadAudio(telegramFileId, telegramBotToken);
      console.log(`📥 Audio downloaded: ${audioPath}`);

      // Step 2: Transcribe with Whisper
      const transcript = await this.transcribeWithWhisper(audioPath);
      console.log(`📝 Transcribed: "${transcript}"`);

      // Step 3: Route and parse intent
      const intent = await this.parseIntent(transcript);
      console.log(`🎯 Intent: ${intent.type} — ${intent.action}`);

      // Step 4: Create via API
      const result = await this.createFromIntent(intent);
      console.log(`✅ Created: ${JSON.stringify(result)}`);

      // Cleanup
      fs.unlinkSync(audioPath);

      return {
        success: true,
        transcript,
        intent,
        result,
        confirmationMessage: this.generateConfirmation(intent, result)
      };
    } catch (error) {
      console.error(`❌ Voice processing error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        confirmationMessage: `❌ Failed to process voice: ${error.message}`
      };
    }
  }

  /**
   * Download audio file from Telegram
   */
  async downloadAudio(fileId, botToken) {
    try {
      // Get file path from Telegram
      const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
      const fileInfoResponse = await axios.get(getFileUrl);

      if (!fileInfoResponse.data.ok) {
        throw new Error(`Telegram API error: ${fileInfoResponse.data.description}`);
      }

      const filePath = fileInfoResponse.data.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      // Download to temp location
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const localPath = path.join(tempDir, `voice-${Date.now()}.ogg`);
      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(localPath, response.data);

      return localPath;
    } catch (error) {
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }

  /**
   * Transcribe audio with local Whisper
   */
  async transcribeWithWhisper(audioPath) {
    try {
      // Check if whisper is installed
      try {
        await execAsync(`which whisper`);
      } catch {
        throw new Error('Whisper not installed. Run: pip install openai-whisper');
      }

      // Run whisper
      const { stdout } = await execAsync(
        `whisper "${audioPath}" --model ${this.whisperModel} --output_format txt --output_dir /tmp --quiet 2>/dev/null`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Read transcript
      const txtFile = audioPath.replace(/\.[^.]+$/, '.txt');
      const transcript = fs.readFileSync(txtFile, 'utf8').trim();
      fs.unlinkSync(txtFile); // cleanup

      return transcript;
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  /**
   * Parse intent from transcript
   */
  async parseIntent(transcript) {
    try {
      // Use intent router
      const parsed = intentRouter.parseVoiceIntent(transcript);

      return {
        type: parsed.type, // 'task', 'note', 'event'
        action: parsed.action, // 'create', 'complete', 'schedule'
        title: parsed.title || transcript,
        description: parsed.description,
        tags: parsed.tags || [],
        date: parsed.date,
        time: parsed.time,
        priority: parsed.priority || 'medium',
        raw: transcript
      };
    } catch (error) {
      // Fallback: treat entire transcript as task
      return {
        type: 'task',
        action: 'create',
        title: transcript,
        description: null,
        tags: ['voice'],
        priority: 'normal',
        raw: transcript
      };
    }
  }

  /**
   * Create data via API based on intent
   */
  async createFromIntent(intent) {
    try {
      const headers = {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      };

      switch (intent.type) {
        case 'task':
          return await this.createTask(intent, headers);
        case 'note':
          return await this.createNote(intent, headers);
        case 'event':
          return await this.createEvent(intent, headers);
        default:
          throw new Error(`Unknown intent type: ${intent.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to create via API: ${error.message}`);
    }
  }

  /**
   * Create task
   */
  async createTask(intent, headers) {
    const response = await axios.post(
      `${this.apiUrl}/api/tasks`,
      {
        text: intent.title,
        due: intent.date,
        priority: intent.priority,
        tags: intent.tags
      },
      { headers }
    );
    return response.data;
  }

  /**
   * Create note
   */
  async createNote(intent, headers) {
    const response = await axios.post(
      `${this.apiUrl}/api/notes`,
      {
        text: intent.title,
        tags: intent.tags
      },
      { headers }
    );
    return response.data;
  }

  /**
   * Create calendar event
   */
  async createEvent(intent, headers) {
    const response = await axios.post(
      `${this.apiUrl}/api/calendar`,
      {
        title: intent.title,
        date: intent.date,
        time: intent.time,
        notes: intent.description
      },
      { headers }
    );
    return response.data;
  }

  /**
   * Generate human-friendly confirmation message
   */
  generateConfirmation(intent, result) {
    const typeEmoji = {
      task: '✅',
      note: '📝',
      event: '📅'
    };

    const emoji = typeEmoji[intent.type] || '✨';

    switch (intent.type) {
      case 'task':
        return `${emoji} Task created: "${intent.title}"${intent.priority !== 'normal' ? ` [${intent.priority}]` : ''}`;
      case 'note':
        return `${emoji} Note saved: "${intent.title}"`;
      case 'event':
        return `${emoji} Event scheduled: "${intent.title}"${intent.date ? ` on ${intent.date}` : ''}`;
      default:
        return `${emoji} Item created`;
    }
  }
}

module.exports = VoiceProcessor;
