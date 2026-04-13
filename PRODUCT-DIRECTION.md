# Product Direction

## Primary Scope

This app is for:
1. Personal workday management
2. Meetings and tasks

It is **not** currently a staff shift / rota / coverage product.

## Core Jobs To Be Done

### 1. Start the day fast
- See today's meetings
- See highest-priority open tasks
- See fresh notes captured today
- Understand what needs attention first

### 2. Capture work with low friction
- Add a task quickly
- Add a meeting or reminder quickly
- Capture a note without deciding too much up front

### 3. Keep meetings and tasks connected
- A meeting often creates follow-up tasks
- A task may belong to a meeting or happen before one
- The dashboard should make that relationship visible over time

### 4. Run the day from one place
- Dashboard should feel like a control panel, not just CRUD tabs
- Today view should be the main surface
- Tasks and calendar should support daily decision-making

## Product Principles

- **Today-first:** the most important screen is the current day
- **Fast capture beats perfect structure**
- **Tasks and meetings are the center of gravity**
- **Notes support action, they are not the main product**
- **Personal clarity over enterprise complexity**

## Recommended Near-Term Roadmap

### Phase A - Stabilize the core
- Fix API/dashboard mismatches
- Remove hardcoded secrets and move config to environment variables
- Clean up documentation so it matches the running system
- Standardize local vs production API configuration

### Phase B - Strengthen daily workflow
- Improve dashboard into a stronger Today view
- Highlight overdue and high-priority tasks clearly
- Show today's meetings in time order
- Add fast actions for task, note, and event capture

### Phase C - Connect tasks and meetings
- Allow linking tasks to an event/meeting
- Add meeting notes and follow-up items
- Let the dashboard show "after this meeting" actions

### Phase D - Smarter daily assistance
- Morning briefing summary
- Suggested priorities for today
- "What changed since yesterday" summary
- Voice capture routed into task/event/note flows

## What Good Looks Like

A user opens the app in the morning and immediately sees:
- where they need to be today
- what matters most today
- what is overdue
- what came in recently
- what to do next
