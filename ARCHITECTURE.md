# Internal Bot Platform - Architecture

## System Overview

```
┌─────────────────────────────────────────────────┐
│         Voice Input (Telegram/Discord)          │
└────────────────────┬────────────────────────────┘
                     │
                     ↓
         ┌──────────────────────────┐
         │   Whisper (Speech→Text)  │
         └────────────┬─────────────┘
                      │
                      ↓
         ┌──────────────────────────┐
         │   Intent Router (Claude) │
         │   Parse: Note/Task/Event │
         └──────────┬───────────────┘
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   [Notes Bot] [Task Bot] [Calendar Bot]
        │           │           │
        ↓           ↓           ↓
   notes/      tasks.json  calendar.json
   YYYY-MM-DD/
        │           │           │
        └───────────┼───────────┘
                    ↓
         ┌──────────────────────────┐
         │   Daily Briefing (9 AM)  │
         │   Aggregate & deliver    │
         └──────────────────────────┘
                    │
                    ↓
            [Telegram to Al Mal]
```

## Components

### 1. Notes Bot
- **Job:** Store ideas, observations, quick captures
- **Input:** `{text: "...", timestamp: "...", tags: ["..."]}`
- **Output:** Markdown file in `storage/notes/YYYY-MM-DD/`
- **Interface:** 
  - `add-note(text, tags)`
  - `list-notes(date)`
  - `search-notes(query)`

### 2. Task Bot
- **Job:** Manage tasks with due dates, priorities, status
- **Storage:** `storage/tasks.json`
- **Format:**
  ```json
  {
    "tasks": [
      {
        "id": "task-001",
        "text": "Follow up with FrontDesk",
        "created": "2026-03-24T09:00Z",
        "due": "2026-03-24",
        "priority": "high",
        "status": "pending",
        "tags": ["operations"]
      }
    ]
  }
  ```
- **Interface:**
  - `add-task(text, due, priority)`
  - `list-tasks(status, priority)`
  - `complete-task(id)`
  - `delete-task(id)`

### 3. Calendar Bot
- **Job:** Manage meetings, events, deadlines
- **Storage:** `storage/calendar.json`
- **Format:**
  ```json
  {
    "events": [
      {
        "id": "event-001",
        "title": "FrontDesk meeting",
        "date": "2026-03-25",
        "time": "14:00",
        "duration": 60,
        "attendees": ["FrontDesk team"],
        "notes": "Discuss occupancy discrepancy"
      }
    ]
  }
  ```
- **Interface:**
  - `add-event(title, date, time, attendees)`
  - `list-events-today()`
  - `list-events-range(from, to)`
  - `reschedule-event(id, new_date, new_time)`

### 4. Intent Router
- **Job:** Parse voice transcript → determine type (note/task/event)
- **Input:** Raw text from Whisper
- **Output:** Structured command + routing decision
- **Examples:**
  - "Reminder to follow up with contractor" → `add-task("Follow up with contractor", priority="high")`
  - "Meeting with Maki Friday at 2 PM" → `add-event("Maki meeting", "2026-03-28", "14:00")`
  - "Cinema occupancy up 5%" → `add-note("Cinema occupancy up 5%", tags=["cinema"])`

### 5. Daily Briefing
- **Job:** Summarize day ahead + pending tasks
- **Triggers:** 9 AM cron OR manual `briefing-today`
- **Steps:**
  1. Query Calendar Bot → today's events
  2. Query Task Bot → pending/high-priority tasks
  3. Query Notes Bot → recent urgent items
  4. Format & send Telegram message
  5. Await confirmation (add/change anything?)

## Data Flow Examples

### Example 1: Voice Task
```
Input: "Remind me to check the worker count tomorrow"

↓ Whisper (transcribe)

"Remind me to check the worker count tomorrow"

↓ Intent Router (parse)

{
  "intent": "task",
  "text": "Check the worker count",
  "due": "2026-03-25",
  "priority": "medium"
}

↓ Task Bot (store)

tasks.json updated with new task

↓ Confirmation

"✅ Task added: 'Check worker count', due 2026-03-25"
```

### Example 2: Voice Meeting
```
Input: "Schedule a meeting with the FrontDesk team Thursday at 2 PM"

↓ Whisper

"Schedule a meeting with the FrontDesk team Thursday at 2 PM"

↓ Intent Router

{
  "intent": "event",
  "title": "FrontDesk team meeting",
  "date": "2026-03-27",
  "time": "14:00",
  "attendees": ["FrontDesk team"]
}

↓ Calendar Bot

calendar.json updated with event

↓ Confirmation

"✅ Meeting scheduled: FrontDesk team, Thursday 2 PM"
```

### Example 3: Daily Briefing
```
9 AM trigger

↓ Calendar Bot query

Today's events: [3 meetings]

↓ Task Bot query

Pending tasks: [5 tasks, 1 high-priority]

↓ Notes Bot query

Recent notes with [urgent] tag: [2 notes]

↓ Format & send

Telegram message with:
- Calendar summary
- Task list (prioritized)
- Urgent notes
- Prompt for confirmation

↓ User responds

"Yes" → Continue day
"Add ..." → Router processes new item
```

## Inter-Bot Communication

Bots communicate via:
1. **File I/O:** Read/write to shared JSON/Markdown files
2. **Sessions:** Each bot runs in separate OpenClaw session
3. **Queue:** Incoming requests routed via Intent Router

**Protocol:**
```javascript
// Bot A wants to query Bot B
const calendar = JSON.parse(fs.readFileSync('storage/calendar.json'));
const todayEvents = calendar.events.filter(e => e.date === today);

// Bot B wants to write
fs.writeFileSync('storage/tasks.json', JSON.stringify(tasks, null, 2));

// Notification to other bots
// (via router: "New task added, check briefing")
```

## Storage Design

### Notes Storage
```
storage/notes/
├── 2026-03-24/
│   ├── 0900-cinema-update.md
│   ├── 1130-frontdesk-notes.md
│   └── 1645-worker-count.md
├── 2026-03-25/
│   └── ...
└── index.json (all notes metadata for search)
```

### Tasks & Calendar
- Single JSON file per type (smaller data volume)
- Each entry has unique ID for easy updates
- Timestamp for sorting/filtering

## Phase Breakdown

### Phase 1: Foundation (This week)
- Create bot skeletons
- Set up file I/O
- Test inter-bot communication
- Validate storage

### Phase 2: Voice Integration (Next week)
- Integrate Whisper
- Build Intent Router
- Add voice confirmation
- Test end-to-end

### Phase 3: Daily Briefing (Next week)
- Create briefing aggregator
- Set up cron job
- Test daily delivery
- Refine format

### Phase 4: Dashboard (Later)
- Optional web UI
- Real-time updates
- Search interface
