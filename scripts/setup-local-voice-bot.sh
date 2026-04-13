#!/bin/bash
# Setup helper for local Telegram voice bot via polling

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🎙️ Local Telegram Voice Bot Setup"
echo "================================="
echo

echo "1) Checking Node.js"
command -v node >/dev/null || { echo "❌ Node.js missing"; exit 1; }
echo "✅ Node.js found: $(node -v)"
echo

echo "2) Checking ffmpeg"
if ! command -v ffmpeg >/dev/null; then
  echo "❌ ffmpeg missing"
  echo "   Install it first, then re-run this script"
  exit 1
fi
echo "✅ ffmpeg found"
echo

echo "3) Checking whisper CLI"
if ! command -v whisper >/dev/null; then
  echo "❌ whisper CLI missing"
  echo "   Install with: pip install -U openai-whisper"
  exit 1
fi
echo "✅ whisper found"
echo

echo "4) Installing Node dependencies"
cd "$ROOT_DIR"
npm install
echo "✅ Node dependencies ready"
echo

echo "5) Next environment variables"
echo "   export TELEGRAM_BOT_TOKEN='***'"
echo "   export API_URL='https://internal-bot-api.onrender.com'"
echo "   export BOT_API_KEY='choose-a-long-random-string'"
echo "   export TELEGRAM_ALLOWED_CHAT_ID='your_chat_id'   # optional but recommended"
echo "   export TELEGRAM_ALLOWED_USER_ID='your_user_id'   # optional but recommended"
echo "   export WHISPER_MODEL='tiny'"
echo
echo "6) Start the bot"
echo "   npm run voice-bot"
