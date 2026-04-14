#!/usr/bin/env node
/**
 * Telegram Voice Bot via long polling
 *
 * Purpose: Run locally without a public webhook URL.
 * Flow: Telegram polling -> download voice -> local whisper -> preview -> user chooses Task/Note/Event -> API write.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

  loadState() {
    try {
      const raw = fs.readFileSync(this.stateFile, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        offset: parsed.offset || 0,
        pendingChoices: parsed.pendingChoices || {},
        updatedAt: parsed.updatedAt || null
      };
    } catch {
      return {
        offset: 0,
        pendingChoices: {},
        updatedAt: null
      };
    }
  }

  saveState(state) {
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify({
      offset: state.offset || 0,
      pendingChoices: state.pendingChoices || {},
      updatedAt: new Date().toISOString()
    }, null, 2));
  }

  loadOffset() {
    return this.loadState().offset || 0;
  }

  saveOffset(offset) {
    const state = this.loadState();
    state.offset = offset;
    this.cleanupPendingChoices(state);
    this.saveState(state);
  }

  cleanupPendingChoices(state) {
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const [choiceId, payload] of Object.entries(state.pendingChoices || {})) {
      const createdAt = payload.createdAt ? new Date(payload.createdAt).getTime() : 0;
      if (!createdAt || now - createdAt > maxAgeMs) {
        delete state.pendingChoices[choiceId];
      }
    }
  }

  storePendingChoice(payload) {
    const state = this.loadState();
    const choiceId = crypto.randomBytes(8).toString('hex');
    state.pendingChoices[choiceId] = {
      ...payload,
      createdAt: new Date().toISOString()
    };
    this.cleanupPendingChoices(state);
    this.saveState(state);
    return choiceId;
  }

  getPendingChoice(choiceId) {
    const state = this.loadState();
    this.cleanupPendingChoices(state);
    this.saveState(state);
    return state.pendingChoices[choiceId] || null;
  }

  deletePendingChoice(choiceId) {
    const state = this.loadState();
    if (state.pendingChoices[choiceId]) {
      delete state.pendingChoices[choiceId];
      this.saveState(state);
    }
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

  isAuthorized(messageLike) {
    const chatId = String(messageLike.chat.id);
    const userId = String(messageLike.from.id);

    if (this.allowedChatId && chatId !== String(this.allowedChatId)) {
      return false;
    }

    if (this.allowedUserId && userId !== String(this.allowedUserId)) {
      return false;
    }

    return true;
  }

  async sendTelegramMessage(chatId, text, extra = {}) {
    const response = await axios.post(this.telegramUrl('sendMessage'), {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra
    });
    return response.data.result;
  }

  async editTelegramMessage(chatId, messageId, text, extra = {}) {
    await axios.post(this.telegramUrl('editMessageText'), {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...extra
    });
  }

  async answerCallbackQuery(callbackQueryId, text = null) {
    await axios.post(this.telegramUrl('answerCallbackQuery'), {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {})
    });
  }

  formatIntentPreview(intent) {
    const labels = {
      task: 'Task',
      note: 'Note',
      event: 'Event'
    };

    const bits = [`Suggested: <b>${labels[intent.type] || intent.type}</b>`];
    if (intent.date) bits.push(`Date: <b>${intent.date}</b>`);
    if (intent.time) bits.push(`Time: <b>${intent.time}</b>`);
    return bits.join(' • ');
  }

  async sendChoicePrompt(message, preview) {
    const choiceId = this.storePendingChoice({
      chatId: String(message.chat.id),
      userId: String(message.from.id),
      transcript: preview.transcript,
      intent: preview.intent
    });

    const transcript = preview.transcript.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const text = [
      '🎙️ I transcribed this voice note:',
      '',
      `<i>${transcript}</i>`,
      '',
      this.formatIntentPreview(preview.intent),
      '',
      'What should I create?'
    ].join('\n');

    await this.sendTelegramMessage(message.chat.id, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Task', callback_data: `voice_choice:${choiceId}:task` },
            { text: '📝 Note', callback_data: `voice_choice:${choiceId}:note` },
            { text: '📅 Event', callback_data: `voice_choice:${choiceId}:event` }
          ],
          [
            { text: '❌ Cancel', callback_data: `voice_choice:${choiceId}:cancel` }
          ]
        ]
      }
    });
  }

  async handleTextMessage(message) {
    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (text === '/start' || text === '/help') {
      await this.sendTelegramMessage(
        chatId,
        '🎙️ Send me a voice note and I will transcribe it first, then ask whether it should become a task, note, or event.'
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
      'Send me a voice note. I will transcribe it, show you buttons, and only create the item after you choose Task, Note, or Event.'
    );
  }

  async handleVoiceMessage(message) {
    const preview = await this.processor.analyzeVoiceMessage(message.voice.file_id, this.botToken);

    if (!preview.success) {
      await this.sendTelegramMessage(
        message.chat.id,
        `❌ Failed to process voice message\n\n${preview.error}`
      );
      return;
    }

    await this.sendChoicePrompt(message, preview);
  }

  async handleCallbackQuery(callbackQuery) {
    const callbackMessage = callbackQuery.message;
    const callbackUser = callbackQuery.from;
    const data = callbackQuery.data || '';
    const match = data.match(/^voice_choice:([a-f0-9]+):(task|note|event|cancel)$/);

    if (!callbackMessage || !callbackUser || !match) {
      await this.answerCallbackQuery(callbackQuery.id, 'Unknown action');
      return;
    }

    const [, choiceId, selectedType] = match;
    const payload = this.getPendingChoice(choiceId);

    if (!payload) {
      await this.answerCallbackQuery(callbackQuery.id, 'This choice expired. Please send a new voice note.');
      return;
    }

    if (String(payload.chatId) !== String(callbackMessage.chat.id) || String(payload.userId) !== String(callbackUser.id)) {
      await this.answerCallbackQuery(callbackQuery.id, 'This choice is not for you.');
      return;
    }

    if (selectedType === 'cancel') {
      this.deletePendingChoice(choiceId);
      await this.editTelegramMessage(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        '❌ Cancelled. Nothing was created.'
      );
      await this.answerCallbackQuery(callbackQuery.id, 'Cancelled');
      return;
    }

    const intent = {
      ...payload.intent,
      type: selectedType
    };

    try {
      const result = await this.processor.createFromIntent(intent);
      const confirmation = this.processor.generateConfirmation(intent, result);
      const transcript = payload.transcript.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      this.deletePendingChoice(choiceId);

      await this.editTelegramMessage(
        callbackMessage.chat.id,
        callbackMessage.message_id,
        `${confirmation}\n\n📝 <i>${transcript}</i>`
      );
      await this.answerCallbackQuery(callbackQuery.id, `${selectedType} created`);
    } catch (error) {
      await this.answerCallbackQuery(callbackQuery.id, 'Failed to create item');
      await this.sendTelegramMessage(
        callbackMessage.chat.id,
        `❌ Failed to create ${selectedType}\n\n${error.message}`
      );
    }
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
        allowed_updates: JSON.stringify(['message', 'callback_query'])
      },
      timeout: (this.pollTimeoutSeconds + 10) * 1000
    });

    const updates = response.data.result || [];
    for (const update of updates) {
      try {
        if (update.callback_query) {
          await this.handleCallbackQuery(update.callback_query);
        } else if (update.message) {
          await this.handleMessage(update.message);
        }
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
