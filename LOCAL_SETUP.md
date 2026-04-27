# Hosting Trust Bank Locally

How to run the Trust Bank Marketing & Sales Suite on your own laptop (macOS, Linux, or Windows with WSL).

## 1. Prerequisites

Install these once if you don't have them:

| Tool       | Version  | How to install                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------ |
| Node.js    | **24.x** | [nodejs.org/en/download](https://nodejs.org/en/download) or `nvm install 24`   |
| pnpm       | **9.x+** | `npm install -g pnpm` (or [pnpm.io/installation](https://pnpm.io/installation)) |
| PostgreSQL | **14+**  | [postgresql.org/download](https://www.postgresql.org/download/) — or run via Docker |
| Git        | any      | [git-scm.com](https://git-scm.com/)                                            |

Verify:

```bash
node -v   # should print v24.x
pnpm -v   # should print 9.x or higher
psql -V   # should print 14+
```

## 2. Get the code

If you haven't already, download or clone the project, then `cd` into the project root:

```bash
cd path/to/trust-bank-project
```

## 3. Set up PostgreSQL

Create a fresh database for the app:

```bash
createdb trustbank-marketing
```

If `createdb` isn't available, use `psql`:

```bash
psql -U postgres -c 'CREATE DATABASE "trustbank-marketing";'
```

(Optional Docker alternative — runs Postgres on port 5432 with no install:)

```bash
docker run --name trustbank-marketing-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=trustbank-marketing -p 5432:5432 -d postgres:16
```

## 4. Configure environment variables

Two `.env` files are needed.

**a) `lib/db/.env`** — for the database CLI tools (push schema, etc.)

```bash
cat > lib/db/.env <<'EOF'
DATABASE_URL=postgres://postgres:postgres@localhost:5432/trustbank-marketing
EOF
```

**b) `artifacts/api-server/.env`** — for the running API server

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Then open `artifacts/api-server/.env` in your editor and add:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/trustbank-marketing
SESSION_SECRET=any-long-random-string-you-like

# DataSling SMS (use the values from your API docs)
DATASLING_SMS_USERNAME=trustbank
DATASLING_SMS_PASSWORD=...
DATASLING_SMS_BEARER_TOKEN=...
DATASLING_SMS_SENDER=TrustBank
```

> Replace `postgres:postgres@localhost:5432` with your actual Postgres user/password/host if different.

## 5. Install dependencies

From the project root:

```bash
pnpm install
```

This installs everything for every package in the monorepo. First run takes a couple of minutes.

## 6. Create the database schema and seed demo data

```bash
# Push the Drizzle schema to your database (creates all tables)
pnpm --filter @workspace/db run push

# Seed the demo dataset (campaigns, leads, deals, notifications…)
pnpm --filter @workspace/api-server run seed
```

You should see "Seeded …" output with row counts.

> The seed script reads `DATABASE_URL` from `artifacts/api-server/.env` automatically.
> The schema push reads it from `lib/db/.env` automatically.

## 7. Run the app

You need **two terminals** open in the project root.

**Terminal 1 — API server (port 8080):**

macOS / Linux:
```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Windows (PowerShell):
```powershell
$env:PORT=8080; pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Web frontend (port 5173):**

macOS / Linux:
```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/trust-bank run dev
```

Windows (PowerShell):
```powershell
$env:PORT=5173; $env:BASE_PATH="/"; pnpm --filter @workspace/trust-bank run dev
```

Now open http://localhost:5173 in your browser. The web app will proxy `/api/*` requests to the API server automatically (configured in `artifacts/trust-bank/vite.config.ts`).

> **Different API port?** Set `API_URL=http://localhost:9000` before running the web frontend to point it elsewhere.

## 8. Build for production (optional)

If you want a production build instead of dev mode:

```bash
# Build everything
pnpm run build

# Run the API
PORT=8080 pnpm --filter @workspace/api-server run start

# Serve the built frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/trust-bank run serve
```

For real production, put nginx (or any reverse proxy) in front and route `/api/*` to port 8080 and everything else to port 5173 — the same pattern Replit uses.

## Troubleshooting

| Symptom                                                  | Fix                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Error: connect ECONNREFUSED 127.0.0.1:5432`             | Postgres isn't running. Start it (`brew services start postgresql`, `sudo service postgresql start`, or `docker start trustbank-marketing-pg`). |
| `DATABASE_URL is not set`                                | The `.env` file isn't being read. Make sure it lives at `artifacts/api-server/.env` (not in the project root) and that you ran step 4. |
| API returns 500 / Zod errors                             | Schema is out of date. Re-run `pnpm --filter @workspace/db run push`.                             |
| SMS returns "SMS provider is not configured"             | Add the four `DATASLING_SMS_*` values to `artifacts/api-server/.env` and restart the API server.  |
| `EADDRINUSE` on port 8080 or 5173                        | Something else is using that port — pick another via `PORT=…`.                                    |
| Browser shows "API request failed" / 502 from `/api/...` | The API server isn't running, or the `API_URL` env var doesn't match where it's listening.        |

## Day-to-day commands

Once set up, you'll mostly use:

```bash
# Terminal 1
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/trust-bank run dev
```

To re-seed (wipes existing demo data):

```bash
pnpm --filter @workspace/api-server run seed
```
