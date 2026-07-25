# Task API

A small in-memory CRUD API for managing a to-do list, built with Express.

## Description

This project provides a simple RESTful API to create, read, update, and delete tasks. It includes an OpenAPI (Swagger) specification and a Swagger UI for interactive documentation.

## Tech Stack

- **Express** (^5.2.1)
- **Swagger UI Express** (^5.0.1)
- **Swagger JSDoc** (^6.3.0)
- **Nodemon** (^3.1.14) (development)

## Project Structure

```
.
├── index.js        # Main server and routes
├── openapi.json    # OpenAPI 3.0 specification
├── package.json    # Dependencies and scripts
├── .gitignore      # Ignores node_modules/
└── README.md       # This file
```

## Installation

```bash
npm install
```

## Running the Server

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

## API Endpoints

| Method | Endpoint         | Description            |
|--------|------------------|------------------------|
| GET    | `/`              | API info               |
| GET    | `/health`        | Health check           |
| GET    | `/tasks`         | List all tasks         |
| POST   | `/tasks`         | Create a new task      |
| GET    | `/tasks/:id`     | Get a single task      |
| PUT    | `/tasks/:id`     | Update a task          |
| DELETE | `/tasks/:id`     | Delete a task          |

## Interactive Documentation

Visit `http://localhost:3000/docs` after starting the server to explore the Swagger UI.

## Default Data

The API initializes with three sample tasks:

- Buy the mona lisa
- Develop a black hole
- Meet abraham linclon

## License

ISC
