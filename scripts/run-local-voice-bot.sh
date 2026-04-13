#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.voice-runtime"
MINIFORGE_DIR="$RUNTIME_DIR/miniforge3"
ENV_DIR="$RUNTIME_DIR/env"

if [ -f "$ROOT_DIR/.env.voice-bot" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.voice-bot"
  set +a
fi

if [ ! -x "$MINIFORGE_DIR/bin/conda" ] || [ ! -d "$ENV_DIR" ]; then
  echo "❌ Local voice runtime is not installed yet"
  echo "   Run: ./scripts/setup-local-voice-bot.sh"
  exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN is not set"
  echo "   Set it in your shell or in .env.voice-bot"
  exit 1
fi

if [ -z "$BOT_API_KEY" ] && [ -z "$API_AUTH_TOKEN" ]; then
  echo "❌ Set BOT_API_KEY or API_AUTH_TOKEN"
  echo "   BOT_API_KEY is recommended"
  exit 1
fi

export PATH="$ENV_DIR/bin:$PATH"

cd "$ROOT_DIR"
exec node router/telegram-poller.js
