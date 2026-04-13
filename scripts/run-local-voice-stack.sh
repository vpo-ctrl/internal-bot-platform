#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -f "$ROOT_DIR/.env.voice-bot" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.voice-bot"
  set +a
fi

PORT="${LOCAL_API_PORT:-3000}"
export PORT
export API_URL="${API_URL:-http://127.0.0.1:$PORT}"

if [ -z "${BOT_API_KEY:-}" ]; then
  echo "❌ BOT_API_KEY is required for the local stack"
  exit 1
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN is required"
  exit 1
fi

cleanup() {
  if [ -n "${API_PID:-}" ] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

echo "🚀 Starting local API on $API_URL"
node api/server.js &
API_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS "$API_URL/api/health" >/dev/null 2>&1; then
    echo "✅ Local API is ready"
    break
  fi
  sleep 1
done

if ! curl -fsS "$API_URL/api/health" >/dev/null 2>&1; then
  echo "❌ Local API failed to start"
  exit 1
fi

echo "🤖 Starting Telegram voice bot"
exec "$ROOT_DIR/scripts/run-local-voice-bot.sh"
