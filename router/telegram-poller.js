#!/usr/bin/env node
/**
 * Telegram Voice Bot via long polling
 *
 * Purpose: Run locally without a public webhook URL.
 * Flow: Telegram polling -> download voice -> local whisper -> intent router -> API write -> Telegram confirmation.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const VoiceProcessor = require('../bots/voice-processor.js');

class TelegramPoller {
  constructor({ botToken, apiUrl, authToken, botApiKey, allowedChatId, allowedUserId, pollTimeoutSeconds = 30, stateFile }) {
    this.botToken = botToken;
    this.apiUrl = apiUrl || 'https://internal-bot-api.onrender.com';
    this.allowedChatId = allowedChatId || null;
    this.allowedUserId = allowedUserId || null;
    this.pollTimeoutSeconds = pollTimeoutSeconds;
    this.stateFile = stateFile || path.join(__dirname, '../storage/telegram-poller-state.json');
    this.running = false;

    this.processor = new VoiceProcessor(this.apiUrl, {
      authToken,
      botApiKey,
      whisperModel: process.env.WHISPER_MODEL,
      whisperLanguage: process.env.WHISPER_LANGUAGE
    });
  }

  telegramUrl(method) {
    return `https://api.telegram.org/bot${this.botToken}/${method}`;
  }

  loadOffset() {
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      return JSON.parse(raw).offset || 0;
    } catch {
      return 0;
    }
  }

  saveOffset(offset) {
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify({ offset, updatedAt: new Date().toISOString() }, null, 2));
  }

  async getMe() {
    const response = await axios.get(this.telegramUrl('getMe'));
    return response.data.result;
  }

  async ensurePollingMode() {
    const response = await axios.post(this.telegramUrl('deleteWebhook'), {
      drop_pending_updates: false
    });

    if (!response.data.ok) {
      throw new Error(`Failed to delete webhook: ${response.data.description}`);
    }

    console.log('🔄 Telegram webhook cleared, polling mode enabled');
  }

  isAuthorized(message) {
    const chatId = String(message.chat.id);
    const userId = String(message.from.id);

    if (this.allowedChatId && chatId !== String(this.allowedChatId)) {
      return false;
    }

    if (this.allowedUserId && userId !== String(this.allowedUserId)) {
      return false;
    }

    return true;
  }

  async sendTelegramMessage(chatId, text) {
    await axios.post(this.telegramUrl('sendMessage'), {
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    });
  }

  async handleTextMessage(message) {
    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (text === '/start' || text === '/help') {
      await this.sendTelegramMessage(
        chatId,
        '🎙️ Send me a voice note and I will turn it into a note, task, or event.'
      );
      return;
    }

    if (text === '/whoami') {
      await this.sendTelegramMessage(
        chatId,
        `chat_id=${message.chat.id}\nuser_id=${message.from.id}`
      );
      return;
    }

    await this.sendTelegramMessage(
      chatId,
      'Send me a voice note. I currently process voice messages into notes, tasks, or calendar events.'
    );
  }

  async handleVoiceMessage(message) {
    const result = await this.processor.processVoiceMessage(message.voice.file_id, this.botToken);
    const reply = result.success
      ? `${result.confirmationMessage}\n\n📝 ${result.transcript}`
      : `❌ Failed to process voice message\n\n${result.error}`;

    await this.sendTelegramMessage(message.chat.id, reply);
  }

  async handleMessage(message) {
    if (!message || !message.chat || !message.from) {
      return;
    }

    if (!this.isAuthorized(message)) {
      console.log(`⚠️ Ignoring unauthorized message from chat ${message.chat.id}, user ${message.from.id}`);
      return;
    }

    console.log(`📨 Message from chat ${message.chat.id}, user ${message.from.id}`);

    if (message.voice) {
      await this.handleVoiceMessage(message);
      return;
    }

    if (message.text) {
      await this.handleTextMessage(message);
    }
  }

  async pollOnce() {
    const offset = this.loadOffset();
    const response = await axios.get(this.telegramUrl('getUpdates'), {
      params: {
        offset,
        timeout: this.pollTimeoutSeconds,
        allowed_updates: JSON.stringify(['message'])
      },
      timeout: (this.pollTimeoutSeconds + 10) * 1000
    });

    const updates = response.data.result || [];
    for (const update of updates) {
      try {
        await this.handleMessage(update.message);
      } catch (error) {
        console.error(`❌ Failed to handle update ${update.update_id}: ${error.message}`);
      } finally {
        this.saveOffset(update.update_id + 1);
      }
    }
  }

  async start() {
    const bot = await this.getMe();
    await this.ensurePollingMode();
    this.running = true;

    console.log(`🤖 Telegram polling bot started: @${bot.username}`);
    console.log(`🔐 API target: ${this.apiUrl}`);
    console.log(`🧠 Whisper model: ${process.env.WHISPER_MODEL || 'default'}`);
    console.log(`🈯 Whisper language: ${process.env.WHISPER_LANGUAGE || 'default'}`);
    console.log(`💾 Offset state: ${this.stateFile}`);

    while (this.running) {
      try {
        await this.pollOnce();
      } catch (error) {
        console.error(`❌ Polling error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  stop() {
    this.running = false;
  }
}

if (require.main === module) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const apiUrl = process.env.API_URL || 'https://internal-bot-api.onrender.com';
  const authToken = process.env.API_AUTH_TOKEN || null;
  const botApiKey = process.env.BOT_API_KEY || null;
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID || null;
  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID || null;

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable not set');
    process.exit(1);
  }

  if (!authToken && !botApiKey) {
    console.error('❌ Set either BOT_API_KEY or API_AUTH_TOKEN');
    process.exit(1);
  }

  const poller = new TelegramPoller({
    botToken,
    apiUrl,
    authToken,
    botApiKey,
    allowedChatId,
    allowedUserId,
    pollTimeoutSeconds: parseInt(process.env.TELEGRAM_POLL_TIMEOUT || '30', 10)
  });

  poller.start().catch((error) => {
    console.error(`❌ Failed to start Telegram poller: ${error.message}`);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n⏹️ Stopping Telegram poller...');
    poller.stop();
  });
}

module.exports = TelegramPoller;
