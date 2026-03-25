#!/bin/bash
# Setup voice webhook for local voice processing
# Runs on Mac mini to listen for Telegram voice messages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=${1:-8001}
BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}

echo "🎙️ Voice Webhook Setup"
echo "====================="
echo ""

# Check Whisper
echo "📋 Checking dependencies..."
if ! command -v whisper &> /dev/null; then
    echo "❌ Whisper not found"
    echo "   Install: pip install openai-whisper"
    exit 1
fi
echo "✅ Whisper found"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi
echo "✅ Node.js found"

# Get bot token
if [ -z "$BOT_TOKEN" ]; then
    echo ""
    echo "❌ TELEGRAM_BOT_TOKEN not set"
    echo "   How to get it:"
    echo "   1. Message @BotFather on Telegram"
    echo "   2. Type: /newbot"
    echo "   3. Give it a name (e.g., 'AM Hostels Voice')"
    echo "   4. Copy the token"
    echo ""
    echo "   Then export it:"
    echo "   export TELEGRAM_BOT_TOKEN='your_token_here'"
    exit 1
fi

echo "✅ Bot token configured"

# Check if token format is valid
if [[ ! $BOT_TOKEN =~ ^[0-9]+:[a-zA-Z0-9_-]+$ ]]; then
    echo "⚠️  Bot token format looks invalid"
    echo "   Expected format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
fi

# Install dependencies
echo ""
echo "📦 Installing Node dependencies..."
cd "$SCRIPT_DIR"
npm install --save axios 2>/dev/null || true
echo "✅ Dependencies ready"

# Show startup command
echo ""
echo "🚀 To start the voice webhook:"
echo ""
echo "   export TELEGRAM_BOT_TOKEN='$BOT_TOKEN'"
echo "   export API_URL='http://localhost:3000'"
echo "   export API_AUTH_TOKEN='your_jwt_token'"
echo "   export WEBHOOK_PORT='$PORT'"
echo "   node router/voice-webhook.js"
echo ""
echo "📍 Webhook will listen on: http://0.0.0.0:$PORT/webhook"
echo ""
