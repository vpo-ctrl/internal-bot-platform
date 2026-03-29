#!/bin/bash
# Auto-deploy script for voice webhook
# Pulls latest code from GitHub and restarts the server

set -e

PROJECT_DIR="/Users/adiramsalem/.openclaw/workspace-alon/internal-bot-platform"
LOG_FILE="/tmp/voice-webhook-deploy.log"

echo "[$(date)] Starting auto-deploy..." >> $LOG_FILE

cd $PROJECT_DIR

# Pull latest code
echo "[$(date)] Pulling latest code from GitHub..." >> $LOG_FILE
git pull origin main >> $LOG_FILE 2>&1

# Kill old webhook process
echo "[$(date)] Stopping old webhook process..." >> $LOG_FILE
pkill -f "node router/voice-webhook.js" || true
sleep 1

# Start new webhook
echo "[$(date)] Starting new webhook server..." >> $LOG_FILE
nohup node router/voice-webhook.js >> /tmp/voice-webhook-cron.log 2>&1 &

sleep 2

# Verify it's running
if pgrep -f "node router/voice-webhook.js" > /dev/null; then
  echo "[$(date)] ✅ Webhook restarted successfully" >> $LOG_FILE
  echo "✅ Auto-deploy completed at $(date)"
else
  echo "[$(date)] ❌ Webhook failed to start" >> $LOG_FILE
  echo "❌ Webhook failed to start"
  exit 1
fi
