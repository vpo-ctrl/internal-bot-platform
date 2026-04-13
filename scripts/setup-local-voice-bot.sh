#!/bin/bash
# Setup helper for local Telegram voice bot via polling

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.voice-runtime"
MINIFORGE_DIR="$RUNTIME_DIR/miniforge3"
ENV_DIR="$RUNTIME_DIR/env"
INSTALLER="$RUNTIME_DIR/Miniforge3-Linux-x86_64.sh"

echo "🎙️ Local Telegram Voice Bot Setup"
echo "================================="
echo

echo "1) Checking Node.js"
command -v node >/dev/null || { echo "❌ Node.js missing"; exit 1; }
echo "✅ Node.js found: $(node -v)"
echo

echo "2) Installing Node dependencies"
cd "$ROOT_DIR"
npm install
echo "✅ Node dependencies ready"
echo

mkdir -p "$RUNTIME_DIR"

echo "3) Ensuring local Python + ffmpeg runtime"
if [ ! -x "$MINIFORGE_DIR/bin/conda" ]; then
  echo "⬇️ Installing Miniforge into $MINIFORGE_DIR"
  curl -L --fail -o "$INSTALLER" https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh
  bash "$INSTALLER" -b -p "$MINIFORGE_DIR"
fi

if [ ! -d "$ENV_DIR" ]; then
  echo "📦 Creating local voice runtime env"
  "$MINIFORGE_DIR/bin/conda" create -y -p "$ENV_DIR" python=3.11 pip ffmpeg
fi

echo "✅ Local runtime available"
echo

echo "4) Ensuring whisper CLI"
if ! "$MINIFORGE_DIR/bin/conda" run -p "$ENV_DIR" whisper --help >/dev/null 2>&1; then
  echo "🧠 Installing openai-whisper"
  "$MINIFORGE_DIR/bin/conda" run -p "$ENV_DIR" python -m pip install openai-whisper
fi

echo "✅ whisper found"
echo "✅ ffmpeg found"
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
echo "   ./scripts/run-local-voice-bot.sh"
