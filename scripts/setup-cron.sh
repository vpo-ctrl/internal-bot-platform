#!/bin/bash

# Setup cron job for daily briefing
# Run this script to install the daily briefing cron job

PROJECT_DIR="/Users/adiramsalem/.openclaw/workspace-alon/internal-bot-platform"
CRON_SCHEDULE="0 9 * * *"  # 9 AM daily
CRON_JOB="$CRON_SCHEDULE node $PROJECT_DIR/scripts/daily-briefing.js run >> /tmp/daily-briefing.log 2>&1"

echo "🔧 Setting up cron job for daily briefing..."
echo ""
echo "Cron schedule: $CRON_SCHEDULE (9 AM daily)"
echo "Command: node $PROJECT_DIR/scripts/daily-briefing.js run"
echo "Log: /tmp/daily-briefing.log"
echo ""

# Add to crontab
(crontab -l 2>/dev/null | grep -v "daily-briefing"; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed successfully!"
echo ""
echo "View crontab:"
echo "  crontab -l"
echo ""
echo "View logs:"
echo "  tail -f /tmp/daily-briefing.log"
