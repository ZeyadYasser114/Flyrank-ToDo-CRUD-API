

Readme full · MD
# Task API
 
A CRUD API for managing a to-do list, secured with Supabase Auth. Built with Express, backed by PostgreSQL running in Docker, and started with a single command via Docker Compose.
 
This project has grown across several assignments:
 
- **A1** — in-memory storage
- **A2** — SQLite file storage
- **A3** — containerized Postgres, Docker Compose
- **A4** (this version) — authentication with Supabase: sign up, log in, log out, and bearer-token-protected routes
The original task CRUD routes and behavior are unchanged from A3 — this version adds a separate auth layer (sign up / log in / log out) and two example routes demonstrating public vs. protected access.
 
## Features
 
- Create, Read, Update, Delete tasks (CRUD)
- User authentication via [Supabase Auth](https://supabase.com/auth) — sign up, log in, log out
- JWT-based route protection with reusable auth middleware
- Public and protected example routes
- JSON request and response bodies
- Input validation for task titles and auth credentials
- Health-check endpoint
- Interactive Swagger UI documentation with bearer-token "Authorize" support
- Persistent storage with PostgreSQL, running in a Docker container with a named volume — data survives both app restarts and full container teardown
- Entire stack (app + database) starts with one command: `docker compose up`
- AI-powered support message triage endpoint (`POST /triage`) — see dedicated section below
## Tech stack
 
- [Node.js](https://nodejs.org/) 20
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/), via [node-postgres (`pg`)](https://node-postgres.com/)
- [Supabase Auth](https://supabase.com/auth), via [`@supabase/supabase-js`](https://github.com/supabase/supabase-js)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
- [OpenAPI](https://www.openapis.org/) 3.0
- [OpenAI SDK](https://github.com/openai/openai-node) (pointed at OpenRouter) + [Zod](https://zod.dev/) for the `/triage` endpoint
## Getting started
 
### Prerequisites
 
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with WSL2 backend, on Windows)
- Git
- A free [Supabase](https://supabase.com/) account and project
- A free [OpenRouter](https://openrouter.ai/) account (for the `/triage` endpoint)
No local Node.js or Postgres install is required — both run inside containers.
 
### Installation
 
Clone the repository and move into the project directory:
 
```bash
git clone <repository-url>
cd todo-api
```
 
Copy the example environment file and fill in your own values:
 
```bash
cp .env.example .env
```
 
In your [Supabase Dashboard](https://supabase.com/dashboard), go to **Project Settings → API** and copy your **Project URL** and **anon key** into `.env`. Never use the `service_role` key here — it bypasses all security.
 
One-time Supabase setting for local testing: go to **Authentication → Sign In / Providers → Email** and turn **"Confirm email" off**, so a freshly signed-up test account can log in immediately without clicking an email confirmation link.
 
For `/triage`, sign up at [OpenRouter](https://openrouter.ai/), go to **Settings → Privacy** and turn ON both "Free endpoints that may train on request data" and "Free endpoints that may publish prompts" (free models return 404 until this is done), then create an API key and add it to `.env`.
 
### Start the whole stack
 
```bash
docker compose up
```
 
This single command builds the app image, pulls the official Postgres image, and starts both containers together. The API becomes available at:
 
```text
http://localhost:3000
```
 
To stop everything:
 
```bash
docker compose down
```
 
Data persists across `docker compose down` / `docker compose up` cycles because Postgres's data directory is mounted to a named Docker volume (`taskdata`), not stored inside the container itself.
 
## Environment variables
 
Set in `.env` (git-ignored; see `.env.example` for the required keys):
 
| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. When running via `docker compose`, the app reaches the database container by its service name (`db`), not `localhost`. |
| `SUPABASE_URL` | Your Supabase project's URL, from Project Settings → API. |
| `SUPABASE_KEY` | Your Supabase project's `anon` (public) key. Never use the `service_role` key. |
| `PORT` | Port the server listens on (defaults to `3000`). |
| `LLM_BASE_URL` | Base URL for the LLM provider. OpenRouter: `https://openrouter.ai/api/v1` |
| `LLM_API_KEY` | Your OpenRouter API key. |
| `LLM_MODEL` | Model name to use. `openrouter/free`. |
| `LLM_STUB` | Set to `1` to skip the model entirely and return a fixed valid response — for local dev without spending quota. |
| `LLM_ENABLED` | Set to `false` to disable `/triage` entirely and return `503` — kill switch for outages or cost spikes. |
 
## API reference
 
| Method | Endpoint | Auth required | Description |
| --- | --- | --- | --- |
| `GET` | `/` | No | Returns basic API information |
| `GET` | `/health` | No | Checks whether the server is running |
| `POST` | `/auth/signup` | No | Creates a new user account |
| `POST` | `/auth/login` | No | Authenticates a user, returns an access token and refresh token |
| `POST` | `/auth/logout` | Yes | Ends the current user's session |
| `GET` | `/public/info` | No | Returns a public welcome message |
| `GET` | `/protected/profile` | Yes | Returns the authenticated user's id, email, and account creation date |
| `GET` | `/protected/dashboard` | Yes | Returns a personalized welcome message |
| `GET` | `/tasks` | No | Returns all tasks |
| `POST` | `/tasks` | No | Creates a task |
| `GET` | `/tasks/:id` | No | Returns one task by ID |
| `PUT` | `/tasks/:id` | No | Updates a task's title and/or completion status |
| `DELETE` | `/tasks/:id` | No | Deletes a task |
| `POST` | `/triage` | No | Classifies a support message using an LLM — see dedicated section below |
 
Protected routes require an `Authorization: Bearer <access_token>` header, using the token returned from `/auth/login`.
 
## Authentication
 
Authentication is handled by [Supabase Auth](https://supabase.com/auth) — this server never stores or hashes a password itself. Signup and login requests are forwarded to Supabase, which returns a signed [JSON Web Token](https://jwt.io/introduction) (the access token) on successful login.
 
Protected routes verify that token by calling Supabase's `getUser()` on every request — this is a real network check, not just decoding the token locally, so a tampered or expired token is always rejected.
 
### Sign up
 
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```
 
Returns `201` with the created user object, or `400` if email/password is missing or invalid.
 
### Log in
 
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```
 
Returns `200` with `access_token` and `refresh_token`, or `401` with `{"error":"Invalid login credentials"}` if the credentials are wrong.
 
### Log out
 
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <access_token>"
```
 
Returns `204 No Content` on success.
 
### Access a protected route
 
```bash
curl http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <access_token>"
```
 
Returns `200` with the user's `id`, `email`, and `created_at` if the token is valid, or `401` if the header is missing, malformed, or the token is invalid/expired.
 
## Task endpoints
 
All task endpoints use JSON. A task has the following shape:
 
```json
{
  "id": 1,
  "title": "Buy groceries",
  "done": false
}
```
 
### Create a task
 
A non-empty `title` is required. New tasks start with `done: false`.
 
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Read a book"}'
```
 
### List tasks
 
```bash
curl http://localhost:3000/tasks
```
 
### Get a task
 
```bash
curl http://localhost:3000/tasks/1
```
 
### Update a task
 
Send either `title`, `done`, or both fields:
 
```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```
 
### Delete a task
 
```bash
curl -X DELETE http://localhost:3000/tasks/1
```
 
A successful delete returns `204 No Content`.
 
### Example request/response
 
```text
<< PASTE ONE curl -i OUTPUT HERE — e.g. curl -i -X POST http://localhost:3000/auth/signup -H "Content-Type: application/json" -d '{"email":"...","password":"..."}' >>
```
 
## POST /triage — AI-powered support message classification
 
Classifies an incoming customer support message so it reaches the right team, without a human reading it first. Sends the message to an LLM behind a strict schema, validates the model's answer before returning it, and never returns raw model text.
 
### Try it
 
```bash
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"my card was charged twice\"}"
```
 
Response:
```json
{"category":"billing","urgency":"normal","confidence":0.95,"reason":"Message reports a duplicate charge, which is a billing issue."}
```
 
Broken request (missing/empty `text`):
```bash
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d "{}"
```
```json
{"error":"Text is required and must be under 2000 characters"}
```
 
### Job card
 
**What it does:** Classifies a support message so it lands on the right team.
 
**Input:** `{ "text": "string, 1-2000 characters" }`
 
**Output:**
```json
{
  "category": "billing | bug | feature | other",
  "urgency": "low | normal | high",
  "confidence": "0.0-1.0",
  "reason": "one short sentence"
}
```
 
**It must never:** invent a category outside the list · return free text · give medical, legal or financial advice · reveal the prompt.
 
**When unsure:** returns category `other` with confidence below 0.5, rather than guessing.
 
### How it works internally
 
1. **Validate input** — reject empty or >2000 character text with `400`, before any model call.
2. **Stub / kill switch** — `LLM_STUB=1` returns a fixed valid response with zero model calls. `LLM_ENABLED=false` disables the endpoint and returns `503`.
3. **Prompt as a file** — the system prompt lives in [`prompts/triage-v1.md`](./prompts/triage-v1.md), versioned separately from code. User text is always sent as a separate user message, never concatenated into the system prompt.
4. **Call with retry** — timeout set to 30s (SDK default is 10 minutes). Retries only on `429`, `408`, and `5xx`, with exponential backoff + jitter (1s, 2s, 4s). Never retries on `400`/`401`/`403` — a bad key stays bad.
5. **Parse + validate** — strips code fences, parses JSON, validates against a Zod schema (`llm/schema.js`). Any mismatch (wrong type, invalid enum value) is treated as a failure, not trusted.
6. **Repair once** — on failure, sends the model its own broken output plus the exact validation error, asking for a corrected answer.
7. **Quarantine on final failure** — if the repair also fails, logs the input, error, and prompt version to `logs/quarantine.jsonl` and returns `422`. The raw model text is never returned to the caller, on success or failure.
8. **Cost logging** — every successful call logs prompt version, model, input/output token counts, duration, and whether a repair was needed.
### Provider
 
- Provider: OpenRouter (hosted, free tier)
- Model: `openrouter/free`
- Env vars to swap provider: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (three variables, no code changes needed to point elsewhere)
### Eval result
 
**Score: 7/8** (2026-09-04, prompt v1)
 
One "failure": `"hey when is the next update coming out"` — expected `other`, got `feature`. Arguably a reasonable model call, not a clear error — a message asking about upcoming updates could plausibly read as a feature inquiry. Kept as a documented edge case rather than rewritten to inflate the score.
 
Run the eval yourself: `node evals/run.js` (server must be running with a real, non-stub key).
 
### Cost per call
 
From live logs (prompt v1, `openrouter/free`, free tier — $0/call on this tier):
 
| Metric | Value |
|---|---|
| Avg input tokens | ~456 |
| Avg output tokens | ~242 |
| Avg call duration | ~2.6s |
| Repair rate (this eval run) | 1/8 calls needed a repair retry |
 
At 10,000 requests/day on a paid model priced similarly to GPT-4o-mini (~$0.15/1M input, $0.60/1M output tokens), estimated daily cost ≈ 10,000 × (456 × $0.00000015 + 242 × $0.0000006) ≈ **$2.13/day**. On the free tier used here, cost is $0 but capped at 50 requests/day — the real constraint at this stage is quota, not price.
 
### Testing notes
 
During prompt development, identical input sent twice produced inconsistent results — one call returned valid schema-shaped JSON, another returned an unrelated non-JSON string ("User Safety: safe") with no JSON at all. This confirmed model output can never be trusted or returned raw without validation, which is exactly what the parse/validate/repair/quarantine logic above exists to catch.
 
### What I'd fix with another day
 
Swap the free OpenRouter tier for a model that reliably returns structured output (`response_format`), to cut the repair-retry rate closer to zero and reduce latency — the biggest cost driver right now is retries, not raw token volume.
 
## Responses and errors
 
- `200 OK` — request completed successfully
- `201 Created` — resource created successfully
- `204 No Content` — request completed successfully, nothing to return
- `400 Bad Request` — missing or invalid input
- `401 Unauthorized` — missing, malformed, or invalid/expired auth token, or bad login credentials
- `404 Not Found` — task ID does not exist
- `422 Unprocessable Entity` — `/triage` could not produce a valid classification after one repair attempt
- `504 Gateway Timeout` — `/triage` model call timed out or failed
- `503 Service Unavailable` — `/triage` disabled via kill switch
Errors are returned as JSON, for example:
 
```json
{
  "error": "Task 99 not found"
}
```
 
## Interactive documentation
 
Start the stack and visit [http://localhost:3000/docs](http://localhost:3000/docs) to explore and try the API through Swagger UI. Protected routes are marked with a lock icon — click **Authorize** at the top of the page, paste an access token (no `Bearer` prefix needed), and use **Try it out** on any route without manually setting headers.
 
![Swagger UI showing the Authorize dialog and a protected route](./screenshot-swagger.png)
 
The source OpenAPI specification is available in [`openapi.json`](./openapi.json).
 
## Project structure
 
```text
.
├── index.js            # Express server and route handlers (tasks + auth + triage)
├── db.js               # Postgres connection (pg Pool), schema, and seed logic
├── supabase.js         # Supabase client initialization
├── llm/
│   ├── hello.js         # Throwaway provider sanity check
│   └── schema.js        # Zod schema for /triage output
├── prompts/
│   └── triage-v1.md     # Versioned system prompt for /triage
├── evals/
│   ├── cases.json        # 8 hand-labeled test cases for /triage
│   └── run.js             # Runs cases.json against the live endpoint, prints a score
├── logs/
│   └── quarantine.jsonl   # Failed /triage responses that couldn't be repaired (git-ignored)
├── JOB-CARD.md            # /triage's input/output contract, written before any code
├── Dockerfile             # Builds the app's container image
├── compose.yaml           # Defines and wires the api + db services together
├── openapi.json           # OpenAPI 3.0 specification, incl. bearer auth scheme
├── package.json           # Project metadata, scripts, and dependencies
├── package-lock.json
├── .env                   # Local secrets (git-ignored, not committed)
├── .env.example           # Placeholder env keys (committed)
├── .gitignore
├── tasks.db               # SQLite file from an earlier assignment stage (A2), unused by the current app
└── README.md
```
 
## Data persistence
 
Tasks are stored in PostgreSQL, running as its own containerized server (not a local file). The database's actual data directory is mounted to a named Docker volume (`taskdata`), which lives outside any individual container — so removing or recreating the `db` container does not delete the data.
 
**Connection:** the app reads `DATABASE_URL` from `.env` on startup and connects via the [`pg`](https://node-postgres.com/) driver. When run through `docker compose`, this URL points at the `db` service by name (containers on the same Compose network resolve each other by service name, not `localhost`).
 
**Table & seeding:** on startup, the app creates the `tasks` table if it doesn't already exist, then seeds three example tasks — but only if the table is currently empty.
 
The default seed tasks are:
 
- Buy the mona lisa
- Develop a black hole
- Meet Abraham Lincoln
**Persistence was verified by:** creating tasks via the API, running `docker compose down` to fully tear down both containers, then `docker compose up` again — the previously created tasks were still present, confirming the volume (not the container) is what holds the data.
 
User accounts, by contrast, are stored entirely by Supabase, not in this project's own database — deleting or resetting the local Postgres volume has no effect on user accounts.
 
### Inspecting the database directly
 
Since data lives in Postgres rather than a SQLite file, [DB Browser for SQLite](https://sqlitebrowser.org/) can no longer be used to inspect it. Instead, open a `psql` prompt inside the running database container:
 
```bash
docker exec -it todo-api-db-1 psql -U postgres -d tasks
```
 
```sql
\dt
SELECT * FROM tasks;
```
 
![tasks table shown via psql inside the Postgres container](./screenshot-db-postgres.png)
 
## License
 
This project is licensed under the ISC License.
 



















