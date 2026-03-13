# Nexus Context Discord Bot (TypeScript)

This bot connects Discord channels to Nexus projects so teams can query tasks, memory, and assistant responses with project-level context.

## Why this structure

The bot is split with clean layers so the same domain/app logic can be reused by future clients (React Native, desktop, or other chat adapters):

- `src/domain`: shared models and ports (interfaces)
- `src/application`: orchestration and formatting use cases
- `src/infrastructure`: API adapter, persistence adapter, assistant providers
- `src/presentation/discord`: Discord command router

## Setup

```bash
cd discord-bot
npm install
cp .env.example .env
```

Required `.env` variables:

- `DISCORD_BOT_TOKEN`

Recommended variables:

- `NEXUS_API_BASE=http://localhost:8000/api`
- `ASSISTANT_PROVIDER=local` or `openai`
- `OPENAI_API_KEY` (if using `openai`)

## Run

```bash
npm run dev
```

Build and type-check:

```bash
npm run check
npm run build
npm start
```

## Commands

- `!projects` — list projects
- `!project use <project-id>` — bind current channel to project
- `!project current` — show current binding
- `!project clear` — clear channel binding
- `!project context [project-id]` — show project snapshot
- `!assistant <question>` — answer with bound project context
- `!assistant --project <project-id> <question>` — target specific project
- `!resume <task-id>` — fetch structured resume packet

## Notes

- Channel bindings are persisted in `data/channel-project-map.json`.
- `ASSISTANT_PROVIDER=openai` automatically falls back to local context mode if OpenAI fails.
