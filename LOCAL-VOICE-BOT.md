# Local Telegram Voice Bot

## Goal

Run voice processing locally while keeping the existing Render API as the source of truth.

Right now, the recommended working setup is:

- local Telegram poller on the always-on machine
- local API on the same machine with `BOT_API_KEY` enabled
- shared MongoDB Atlas as the data store behind both local and Render environments

That means the bot can work immediately, even before the newer bot-auth API changes are deployed to Render.

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
- `WHISPER_MODEL` (optional, recommended for Hebrew: `base`)
- `WHISPER_LANGUAGE` (optional, recommended for Hebrew: `he`)

## Recommended bot auth model

Use a dedicated `BOT_API_KEY` between the local bot and the API instead of a user JWT.

Why:
- JWT expires
- service-to-service auth is more stable
- clearer separation between human login and automation

## Quick start

```bash
./scripts/setup-local-voice-bot.sh
cp .env.voice-bot.example .env.voice-bot
# edit .env.voice-bot
./scripts/run-local-voice-stack.sh
```

The setup script is rootless. It installs a self-contained local runtime under `.voice-runtime/` with:

- Miniforge
- Python
- ffmpeg
- openai-whisper

This avoids requiring `apt` or system-wide Python packages.

## Notes

- The current bot supports voice messages plus simple `/start`, `/help`, and `/whoami` text commands.
- `/whoami` is useful for discovering the chat/user IDs you may want to allowlist.
- On first Whisper use, the selected model is downloaded and cached locally.
- `run-local-voice-stack.sh` starts both the local API and the Telegram bot together.
- If you later deploy the new API auth changes to Render, you can switch `API_URL` back to the Render endpoint and run only `./scripts/run-local-voice-bot.sh`.
