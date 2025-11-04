
# Simple Financial / NexusFlow (Next.js + Postgres + Telegram + SQLite)

A full‑stack Next.js (App Router) project that serves a static UI (`public/nexusflow.html`) and exposes a typed REST API under `/api/*` for **users, profiles, projects, tasks, milestones**, and **communications** (AI suggestions, Telegram task notifications).

This README is generated to match the code in this repo as of **2025-10-10**.

---

## 🧭 What’s inside

- **Next.js 15 (App Router)** — UI shell + static app in `public/`
- **PostgreSQL** — primary DB for users, profiles, projects, tasks, milestones, and communications
- **SQLite (better-sqlite3)** — isolated To‑Do module persisted to `db/nexusflow.sqlite`
- **Auth (JWT)** — `/api/auth/login` returns a short JWT used as `Authorization: Bearer <token>`
- **AI Suggestions (optional)** — `/api/ai/suggest-assignees` uses `OPENAI_API_KEY` (falls back to heuristic if missing)
- **Telegram Bot (webhook)** — send task assignment messages; webhook endpoint is `/api/communications/telegram/webhook/[secret]`

---

## ✅ Prerequisites

- **Node.js 20+** (18 works, but 20 is recommended)
- **PostgreSQL 14+** (local or cloud: Supabase, Neon, Railway, Azure PG, etc.)
- **Git** (optional, but recommended)

> **Windows & better‑sqlite3**: Prebuilt binaries are usually installed, but if you hit a native build error, install “Desktop development with C++” (MSVC) via Visual Studio Installer and retry `npm i`.

---

## 🚀 Quick Start

```bash
# 1) Install deps
npm install

# 2) Create your .env (see below) and update DATABASE_URL
cp .env .env.local   # or create manually

# 3) Initialize PostgreSQL schema
#    Option A: use psql to run the SQL file in /db
psql "postgresql://USER:PASS@HOST:PORT/DBNAME" -f db/schema.sql

#    Option B (cloud GUIs): paste db/schema.sql into your SQL editor and run it.

# 4) Start dev server
npm run dev

# App:          http://localhost:3000        (redirects to /nexusflow.html)
# Health check: http://localhost:3000/api/health
# DB info:      http://localhost:3000/api/debug/db
```

---

## 🔧 Configuration (.env)

Create **.env** (and/or **.env.local**) with the following keys:

```ini
# --- PostgreSQL connection ---
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/nexusflow
# Optional, for TLS-only providers (Neon/Railway etc.)
PGSSL=true

# --- JWT auth ---
JWT_SECRET=replace_me_with_a_long_random_string
JWT_EXPIRES_IN=7d

# --- (Optional) OpenAI for AI suggestions ---
OPENAI_API_KEY=sk-your-openai-key
# If omitted, the app falls back to a keyword-based heuristic.

# --- Telegram (optional, used for task notifications) ---
TELEGRAM_BOT_TOKEN=123456:ABC...           # BotFather -> /newbot
TG_WEBHOOK_SECRET=your-long-random-secret  # any random string
APP_URL=https://your-domain.com            # required in production for webhook
# (or) PUBLIC_URL=https://your-domain.com

# --- Misc ---
NODE_ENV=development
```

> **Security**: Never commit real secrets. If sensitive values already exist in `.env` in your repo history, rotate them immediately.

---

## 🗄️ Database Setup (PostgreSQL)

1. **Create a database** (example: `nexusflow`):
   ```bash
   createdb nexusflow
   ```

2. **Run the schema**:
   ```bash
   psql "postgresql://USER:PASS@HOST:PORT/nexusflow" -f db/schema.sql
   ```

3. **(Optional) Seed data**: `db/seed.sql` exists (currently empty). You can add your own inserts.

4. **Verify connection**:
   - `GET /api/debug/db` → returns current DB, user, and visible tables.
   - `GET /api/health` → standard health probe.

> The **To‑Do** module uses a separate local SQLite file at `db/nexusflow.sqlite` and self‑creates its tables on first use (no action needed).

---

## 🧑‍💻 Run & Build

```bash
# Dev
npm run dev

# Production build
npm run build

# Start production server (after build)
npm start

# Lint
npm run lint
```

- In dev, the root page redirects to **`/nexusflow.html`** (served from `public/`). Your REST API is under **`/api/*`**.

---

## 🔐 Authentication (JWT)

- Create a user:
  ```bash
  curl -X POST http://localhost:3000/api/users     -H "Content-Type: application/json"     -d '{ "name":"Admin", "email":"admin@example.com", "password":"P@ssw0rd123" }'
  ```

- Login to receive a token:
  ```bash
  TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login     -H "Content-Type: application/json"     -d '{ "email":"admin@example.com", "password":"P@ssw0rd123" }' | jq -r .token)
  echo "$TOKEN"
  ```

- Use the token:
  ```bash
  curl http://localhost:3000/api/projects     -H "Authorization: Bearer $TOKEN"
  ```

---

## 📚 Key API Endpoints (summary)

> Most endpoints require `Authorization: Bearer <JWT>`.

### Users
- `GET    /api/users` — list users
- `POST   /api/users` — create user `{ name, email, password }`

### Auth
- `POST   /api/auth/login` — returns `{ token }`

### Profiles
- `GET    /api/profiles?q=&page=&limit=`
- `POST   /api/profiles` — create
- `GET    /api/profiles/[id]`
- `PATCH  /api/profiles/[id]`
- `DELETE /api/profiles/[id]`

### Projects & Tasks
- `GET    /api/projects?q=&page=&limit=`
- `POST   /api/projects`
- `GET    /api/projects/[id]` — includes tasks
- `PATCH  /api/projects/[id]`
- `DELETE /api/projects/[id]`

- `GET    /api/tasks?projectId=&assigneeId=&status=&page=&limit=`
- `POST   /api/tasks` — create
- `GET    /api/tasks/[id]`
- `PATCH  /api/tasks/[id]`
- `DELETE /api/tasks/[id]`
- `POST   /api/tasks/[id]/move` — reorder tasks within project

### Milestones
- `GET    /api/milestones?projectId=&page=&limit=`
- `POST   /api/milestones`
- `GET    /api/milestones/[id]`
- `PATCH  /api/milestones/[id]`
- `DELETE /api/milestones/[id]`

### Communications (AI + Schedules + Logs)
- `GET    /api/communications?projectId=` — returns per‑task schedules and recent logs
- `POST   /api/communications` — upsert schedule for a task `{ taskId, active, frequency, days, prompt }`
- `POST   /api/ai/suggest-assignees` — `{ title, description?, topK? }` → suggestions

### Telegram
- **Webhook**: `POST /api/communications/telegram/webhook/[secret]`
- **Send**: `POST /api/telegram/send-message` — `{ profileId, task, adminEmail?, aiUrl? }`

---

## 🤖 AI Suggestions (optional)

- Set `OPENAI_API_KEY` to enable model‑based ranking (`gpt-4o-mini`).
- If not set, the API falls back to a deterministic keyword‑match heuristic so the endpoint still works for demos.

```bash
curl -X POST http://localhost:3000/api/ai/suggest-assignees   -H "Content-Type: application/json"   -d '{ "title": "Redesign the landing page", "description": "Tailwind + Next", "topK": 3 }'
```

---

## 📣 Telegram Setup (Task Notifications)

1. **Create a bot** with **@BotFather** → `/newbot`, copy the bot token.
2. **Set env**:
   ```ini
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TG_WEBHOOK_SECRET=your-long-random-secret
   APP_URL=https://your-domain.com     # or PUBLIC_URL=...
   ```
3. **Deploy** your app with a public URL.
4. **Register webhook** (one‑time):
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<APP_URL>/api/communications/telegram/webhook/<TG_WEBHOOK_SECRET>"
   ```
5. **Link a user**: in Telegram, open your bot → `/start` → share contact. Your backend matches by phone and stores `telegram_chat_id` for the profile.
6. **Send a test**:
   ```bash
   curl -X POST http://localhost:3000/api/telegram/send-message      -H "Content-Type: application/json"      -d '{ "profileId": 1, "task": { "id": 123, "title": "Design header", "priority": "high" } }'
   ```

> In production, the webhook endpoint is:  
> `https://YOUR_DOMAIN/api/communications/telegram/webhook/TG_WEBHOOK_SECRET`

---

## 🧩 To‑Do Module (SQLite)

- Uses **better‑sqlite3** and stores data in **`db/nexusflow.sqlite`**.
- Tables auto‑create on first use; no Postgres tables are involved for this module.

---

## 🧪 Health & Debug

- `GET /api/health` → `{ ok: true }`
- `GET /api/debug/db` → shows DB/user/schema and public tables

---

## 🛠️ Troubleshooting

- **ECONNREFUSED :5432** → PostgreSQL is not running or `DATABASE_URL` is wrong.
- **no pg_hba.conf entry** → your PG server rejects connections from your host; fix pg_hba.conf or use proper cloud connection string.
- **SSL errors** with cloud PG → set `PGSSL=true` in `.env`.
- **better‑sqlite3 build** on Windows → install MSVC toolchain (Visual Studio → “Desktop development with C++”).

---

## 📦 Deploy Notes

- **Vercel / Node server / Azure App Service** all work. Ensure:
  - Set all environment variables from `.env` in your hosting.
  - Expose a public **APP_URL** (or **PUBLIC_URL**) for Telegram webhooks.
  - If using serverless, the webhook route will work; stick to webhooks (no long‑polling).

---

## 📁 License

Proprietary / internal project (update to your preferred license).

---

## 🙋 Support

- Ping the maintainer or open an issue in your project tracker.
