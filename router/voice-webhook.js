#!/usr/bin/env node
/**
 * Telegram Voice Webhook Listener
 * 
 * Receives voice messages from Telegram
 * Processes via Whisper + Intent Router
 * Creates tasks/notes/events via API
 * Replies with confirmation
 */

const express = require('express');
const VoiceProcessor = require('../bots/voice-processor.js');
const axios = require('axios');

class VoiceWebhook {
  constructor(botToken, apiUrl, authToken, port = 8001) {
    this.botToken = botToken;
    this.apiUrl = apiUrl || 'http://localhost:3000';
    this.authToken = authToken;
    this.port = port;
    
    this.app = express();
    this.processor = new VoiceProcessor(apiUrl, authToken);
    
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'voice-webhook' });
    });

    // Telegram webhook
    this.app.post('/webhook', async (req, res) => {
      try {
        const message = req.body.message;

        if (!message) {
          return res.status(400).json({ error: 'No message' });
        }

        console.log(`📨 Received message from ${message.from.id}`);

        // Check if it's a voice message
        if (!message.voice) {
          console.log('ℹ️ Not a voice message, ignoring');
          return res.json({ ok: true });
        }

        // Process voice asynchronously (don't block webhook response)
        this.processVoiceAsync(message);

        // Return 200 immediately to Telegram
        res.json({ ok: true });
      } catch (error) {
        console.error(`❌ Webhook error: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Process voice message asynchronously
   */
  async processVoiceAsync(message) {
    try {
      const userId = message.from.id;
      const chatId = message.chat.id;
      const fileId = message.voice.file_id;

      console.log(`🎙️ Processing voice from user ${userId}`);

      // Process voice
      const result = await this.processor.processVoiceMessage(
        fileId,
        this.botToken
      );

      // Send confirmation to Telegram
      const confirmMessage = result.success
        ? result.confirmationMessage
        : `❌ Error: ${result.error}`;

      await this.sendTelegramMessage(chatId, confirmMessage);

      if (result.success) {
        console.log(`✅ Voice processed successfully`);
        console.log(`   Transcript: "${result.transcript}"`);
        console.log(`   Intent: ${result.intent.type} — ${result.intent.action}`);
        console.log(`   Created: ${JSON.stringify(result.result)}`);
      }
    } catch (error) {
      console.error(`❌ Async processing failed: ${error.message}`);
      
      // Try to send error message to user
      try {
        const chatId = message.chat.id;
        await this.sendTelegramMessage(
          chatId,
          `❌ Failed to process voice message: ${error.message}`
        );
      } catch (e) {
        console.error(`Failed to send error message: ${e.message}`);
      }
    }
  }

  /**
   * Send message via Telegram API
   */
  async sendTelegramMessage(chatId, text) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      });

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

      console.log(`✅ Message sent to ${chatId}`);
      return response.data.result;
    } catch (error) {
      console.error(`❌ Failed to send Telegram message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start webhook server
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '0.0.0.0', () => {
          console.log(`\n🎙️ Voice Webhook started on port ${this.port}`);
          console.log(`📍 Telegram webhook URL: https://your-domain.com/webhook`);
          console.log(`🤖 Bot token: ${this.botToken.substring(0, 10)}...`);
          console.log(`🔐 API: ${this.apiUrl}`);
          console.log(`⏳ Ready to receive voice messages\n`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop webhook server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Voice webhook stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI Interface
if (require.main === module) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const authToken = process.env.API_AUTH_TOKEN;
  const port = parseInt(process.env.WEBHOOK_PORT || '8001');

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable not set');
    console.error('   Export it: export TELEGRAM_BOT_TOKEN="your_token_here"');
    process.exit(1);
  }

  if (!authToken) {
    console.error('❌ API_AUTH_TOKEN environment variable not set');
    console.error('   You need a valid JWT token to create tasks/notes/events');
    process.exit(1);
  }

  const webhook = new VoiceWebhook(botToken, apiUrl, authToken, port);

  webhook.start()
    .then(() => {
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n⏹️ Shutting down...');
        await webhook.stop();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error(`❌ Failed to start: ${error.message}`);
      process.exit(1);
    });
}

module.exports = VoiceWebhook;
