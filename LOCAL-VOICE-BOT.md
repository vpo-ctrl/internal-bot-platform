# Local Telegram Voice Bot

## Goal

Run voice processing locally while keeping the existing Render API as the source of truth.

## Architecture

1. Telegram bot receives a voice note
2. Local polling process downloads the audio
3. Local Whisper transcribes the audio
4. Intent router classifies note / task / event
5. Local bot sends the result to the Render API
6. Telegram bot replies with a confirmation

## Why polling

- No public webhook URL needed
- Better fit for a local always-on machine
- Less deployment complexity than Render webhook handling

## Required environment variables

- `TELEGRAM_BOT_TOKEN`
- `API_URL` (default: `https://internal-bot-api.onrender.com`)
- `BOT_API_KEY` (recommended) or `API_AUTH_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID` (recommended)
- `TELEGRAM_ALLOWED_USER_ID` (recommended)
- `WHISPER_MODEL` (optional, default: `tiny`)

## Recommended bot auth model

Use a dedicated `BOT_API_KEY` between the local bot and the API instead of a user JWT.

Why:
- JWT expires
- service-to-service auth is more stable
- clearer separation between human login and automation

## Quick start

```bash
./scripts/setup-local-voice-bot.sh
npm run voice-bot
```

## Notes

- The current bot supports voice messages plus simple `/start`, `/help`, and `/whoami` text commands.
- `/whoami` is useful for discovering the chat/user IDs you may want to allowlist.
