# Task API

A lightweight CRUD API for managing a to-do list. Built with Express, backed by PostgreSQL running in Docker, and started with a single command via Docker Compose.

This is the third storage swap in this project's history: in-memory (A1) → SQLite file (A2) → containerized Postgres (this version, A3). The API's routes and behavior are unchanged across all three — only the storage engine underneath has changed.

## Features

- Create, Read, Update, Delete tasks (CRUD)
- JSON request and response bodies
- Input validation for task titles
- Health-check endpoint
- Interactive Swagger UI documentation
- Persistent storage with PostgreSQL, running in a Docker container with a named volume — data survives both app restarts and full container teardown
- Entire stack (app + database) starts with one command: `docker compose up`

## Tech stack

- [Node.js](https://nodejs.org/) 20
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/), via [node-postgres (`pg`)](https://node-postgres.com/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
- [OpenAPI](https://www.openapis.org/) 3.0

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with WSL2 backend, on Windows)
- Git

No local Node.js or Postgres install is required — both run inside containers.

### Installation

Clone the repository and move into the project directory:

```bash
git clone <repository-url>
cd todo-api
```

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

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

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Returns basic API information |
| `GET` | `/health` | Checks whether the server is running |
| `GET` | `/tasks` | Returns all tasks |
| `POST` | `/tasks` | Creates a task |
| `GET` | `/tasks/:id` | Returns one task by ID |
| `PUT` | `/tasks/:id` | Updates a task's title and/or completion status |
| `DELETE` | `/tasks/:id` | Deletes a task |

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
<< PASTE ONE curl -i OUTPUT HERE — e.g. curl -i http://localhost:3000/tasks >>
```

## Responses and errors

- `200 OK` — request completed successfully
- `201 Created` — task created successfully
- `204 No Content` — task deleted successfully
- `400 Bad Request` — title is missing or empty
- `404 Not Found` — task ID does not exist

Errors are returned as JSON, for example:

```json
{
  "error": "Task 99 not found"
}
```

## Interactive documentation

Start the stack and visit [http://localhost:3000/docs](http://localhost:3000/docs) to explore and try the API through Swagger UI. The source OpenAPI specification is available in [`openapi.json`](./openapi.json).

## Project structure

```text
.
├── index.js         # Express server and route handlers
├── db.js            # Postgres connection (pg Pool), schema, and seed logic
├── Dockerfile        # Builds the app's container image
├── compose.yaml       # Defines and wires the api + db services together
├── openapi.json      # OpenAPI 3.0 specification
├── package.json      # Project metadata, scripts, and dependencies
├── package-lock.json
├── .env               # Local secrets (git-ignored, not committed)
├── .env.example       # Placeholder env keys (committed)
├── .gitignore
├── tasks.db           # SQLite file from an earlier assignment stage (A2), unused by the current app
└── README.md
```

## Data persistence

Tasks are stored in PostgreSQL, running as its own containerized server (not a local file). The database's actual data directory is mounted to a named Docker volume (`taskdata`), which lives outside any individual container — so removing or recreating the `db` container does not delete the data.

**Connection:** the app reads `DATABASE_URL` from `.env` on startup and connects via the [`pg`](https://node-postgres.com/) driver. When run through `docker compose`, this URL points at the `db` service by name (containers on the same Compose network resolve each other by service name, not `localhost`).

**Table & seeding:** on startup, the app creates the `tasks` table if it doesn't already exist, then seeds three example tasks — but only if the table is currently empty. This mirrors the "seed once" behavior from earlier assignment stages.

The default seed tasks are:

- Buy the mona lisa
- Develop a black hole
- Meet Abraham Lincoln

**Persistence was verified by:** creating tasks via the API, running `docker compose down` to fully tear down both containers, then `docker compose up` again — the previously created tasks were still present, confirming the volume (not the container) is what holds the data.

### Inspecting the database directly

Since data now lives in Postgres rather than a SQLite file, [DB Browser for SQLite](https://sqlitebrowser.org/) can no longer be used to inspect it. Instead, open a `psql` prompt inside the running database container:

```bash
docker exec -it taskdb psql -U postgres -d tasks
```

```sql
\dt
SELECT * FROM tasks;
```

![tasks table shown via psql inside the Postgres container](./screenshot-db-postgres.png)

## License

This project is licensed under the ISC License.