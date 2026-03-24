# Internal Bot Platform

**Purpose:** Voice notes → task/meeting management → daily briefing, all within your workspace.

## Quick Start

```bash
# Start all bots (Phase 1)
npm start

# Add a note (via voice or text)
voice-note "This is my note"

# Add a task
add-task "Follow up with FrontDesk" --due 2026-03-25 --priority high

# Add a meeting
add-event "FrontDesk meeting" --date 2026-03-25 --time 14:00

# Check briefing
briefing-today

# Search notes
search-notes "occupancy"
```

## Architecture

See: `ARCHITECTURE.md`

## Project Status

- **Phase 1 (Foundation):** IN PROGRESS
  - [ ] Notes Bot (skeleton)
  - [ ] Task Bot (skeleton)
  - [ ] Calendar Bot (skeleton)
  - [ ] Inter-bot communication
  - [ ] Storage validation

- **Phase 2 (Voice):** Pending
- **Phase 3 (Daily Briefing):** Pending
- **Phase 4 (Dashboard):** Pending

## Storage

- Notes: `/internal-bot-platform/storage/notes/`
- Tasks: `/internal-bot-platform/storage/tasks.json`
- Calendar: `/internal-bot-platform/storage/calendar.json`

## Files

- `bots/` - Individual bot agents
- `config/` - Configuration files
- `router/` - Voice/intent routing logic
- `storage/` - Data storage
- `scripts/` - Helper scripts and utilities
