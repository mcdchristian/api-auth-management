<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">API Auth & User Management</h1>

<p align="center">
  A secure, production-ready REST API for authentication and user management built with <strong>NestJS</strong>, <strong>TypeORM</strong>, and <strong>PostgreSQL</strong>.
</p>

<p align="center">
  <strong>Author:</strong> Del'or Mutaliko
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-v11-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Authentication Flow](#-authentication-flow)
- [API Documentation (Swagger)](#-api-documentation-swagger)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🚀 Features

- **JWT Authentication** — Secure login & registration with access and refresh tokens.
- **Refresh Token Rotation** — Hashed refresh tokens stored in the database for secure session persistence.
- **Role-Based Access Control (RBAC)** — Three built-in roles: `user`, `admin`, and `manager` with route-level protection.
- **Password Security** — Passwords hashed with **bcrypt** (work factor 12, configurable).
- **Brute-Force Protection** — Per-IP rate limiting plus per-account lockout after repeated failed logins.
- **Audit Trail** — Every authentication and user-management event persisted to PostgreSQL, queryable by admins.
- **Database Migrations** — Versioned schema via TypeORM migrations; `synchronize` never runs outside development.
- **Input Validation** — Request body validation using `class-validator` with auto-stripping of unknown fields.
- **Swagger Documentation** — Interactive API docs auto-generated from decorators.
- **Environment Configuration** — Centralized config management via `.env` files using `@nestjs/config`.
- **UUID Primary Keys** — All user IDs are UUIDs for better security and distribution.

---

## 🧰 Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| **Runtime**      | Node.js                             |
| **Framework**    | NestJS 11                           |
| **Language**     | TypeScript 5.7                      |
| **ORM**          | TypeORM 0.3                         |
| **Database**     | PostgreSQL                          |
| **Auth**         | Passport.js + `@nestjs/jwt`         |
| **Validation**   | class-validator, class-transformer  |
| **Docs**         | Swagger (`@nestjs/swagger`)         |
| **Testing**      | Jest + Supertest                    |

---

## 🏗 Architecture

```
Client (Postman / Frontend)
        │
        ▼
   ┌──────────┐     ┌──────────────┐     ┌────────────┐
   │  Guards   │────▶│  Controllers │────▶│  Services  │
   │ (JWT/Role)│     │  (Routes)    │     │  (Logic)   │
   └──────────┘     └──────────────┘     └─────┬──────┘
                                               │
                                               ▼
                                        ┌────────────┐
                                        │  TypeORM   │
                                        │ Repository │
                                        └─────┬──────┘
                                              │
                                              ▼
                                        ┌────────────┐
                                        │ PostgreSQL │
                                        └────────────┘
```

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** — v18 or higher
- **[PostgreSQL](https://www.postgresql.org/)** — v14 or higher
- **[npm](https://www.npmjs.com/)** — v9 or higher (comes with Node.js)

---

## 🏁 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mcdchristian/api-auth-management.git
cd api-auth-management
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

With Docker — nothing to install:

```bash
docker compose up -d db
```

Or against an existing PostgreSQL instance:

```sql
CREATE DATABASE auth_db;
```

### 4. Configure environment variables

Create a `.env` file at the project root:

```bash
cp .env.example .env
```

Fill in the values (see [Environment Variables](#-environment-variables) below).

### 5. Start the server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

In development the schema is created automatically from the entity
definitions. Everywhere else it comes from
[migrations](#-database-migrations).

### Or bring up the whole stack

```bash
docker compose up --build
```

Starts PostgreSQL and the API together, waiting on a `pg_isready` healthcheck
so the API never races an initialising database.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

| Variable                    | Description                                            | Default                              |
|-----------------------------|--------------------------------------------------------|--------------------------------------|
| `NODE_ENV`                  | `development` \| `test` \| `production`                 | `development`                        |
| `PORT`                      | Server port                                            | `3000`                               |
| `DB_HOST`                   | PostgreSQL host                                        | `localhost`                          |
| `DB_PORT`                   | PostgreSQL port                                        | `5432`                               |
| `DB_USERNAME`               | Database username                                      | `postgres`                           |
| `DB_PASSWORD`               | Database password                                      | `postgres`                           |
| `DB_NAME`                   | Database name                                          | `auth_db`                            |
| `DB_SSL`                    | Require TLS to the database (on for managed Postgres)  | `false`                              |
| `DB_RUN_MIGRATIONS`         | Apply pending migrations on boot                       | `false`                              |
| `JWT_SECRET`                | Secret key for access tokens                           | — (required in production)           |
| `JWT_EXPIRATION`            | Access token lifetime                                  | `15m`                                |
| `JWT_REFRESH_SECRET`        | Secret key for refresh tokens                          | — (required in production)           |
| `JWT_REFRESH_EXPIRATION`    | Refresh token lifetime                                 | `7d`                                 |
| `BCRYPT_ROUNDS`             | bcrypt work factor                                     | `12`                                 |
| `MAX_FAILED_LOGIN_ATTEMPTS` | Failed logins before an account is locked              | `5`                                  |
| `LOCKOUT_DURATION_MS`       | Lockout duration in milliseconds                       | `900000` (15 min)                    |
| `SWAGGER_ENABLED`           | Publish the Swagger UI at `/api/docs`                  | `true`, `false` when in production   |
| `ALLOWED_ORIGINS`           | Comma-separated CORS origins                           | `http://localhost:3000,...:5173`     |
| `THROTTLE_TTL`              | Rate-limit window in milliseconds                      | `60000`                              |
| `THROTTLE_LIMIT`            | Requests allowed per window                            | `20`                                 |

> `DB_RUN_MIGRATIONS` is off by default on purpose: several instances starting
> at once would race on the same migration. Run `npm run migration:run` as a
> release step instead.

[`.env.example`](.env.example) is the authoritative template — copy it rather
than assembling a file by hand:

```bash
cp .env.example .env
```

Generate real secrets with:

```bash
openssl rand -base64 48
```

> ⚠️ **Never commit your `.env` file to version control.** It is already listed in `.gitignore`.

---

## 🏃 Running the Application

```bash
# Development (with hot-reload)
npm run start:dev

# Standard mode
npm run start

# Debug mode
npm run start:debug

# Production mode
npm run build
npm run start:prod
```

---

## 🗄 Database Migrations

`synchronize` runs only when `NODE_ENV=development`. Any other environment —
staging included — gets its schema from the migrations in
`src/database/migrations`.

```bash
# Apply pending migrations
npm run migration:run

# Show what has and has not been applied
npm run migration:show

# Roll the most recent one back
npm run migration:revert

# Generate a migration from a change to the entities
npm run migration:generate -- src/database/migrations/DescribeTheChange
```

The CLI reads `src/database/data-source.ts`, which takes the same environment
variables as the running application.

The baseline migration is written to be safe against a database that
`synchronize` already populated, so an existing instance can adopt the
migration history without being rebuilt.

---

## 📡 API Endpoints

All routes are prefixed with `/api/v1`.

### Authentication (`/auth`)

| Method | Endpoint                | Description                       | Auth Required | Rate limit |
|--------|-------------------------|-----------------------------------|:-------------:|------------|
| POST   | `/auth/register`        | Register a new user               |      ❌       | 5/min      |
| POST   | `/auth/login`           | Login & get tokens                |      ❌       | 5/min      |
| POST   | `/auth/logout`          | Logout (invalidates refresh token)|      ✅       | 20/min     |
| POST   | `/auth/refresh`         | Rotate access & refresh tokens    |      ❌       | 10/min     |
| PATCH  | `/auth/change-password` | Change your own password          |      ✅       | 20/min     |

### Users (`/users`)

| Method | Endpoint         | Description                      | Auth Required | Role     |
|--------|------------------|----------------------------------|:-------------:|----------|
| GET    | `/users`         | List users (paginated)           |      ✅       | `admin`  |
| GET    | `/users/profile` | Get your own profile             |      ✅       | Any      |
| PATCH  | `/users/profile` | Update your own email            |      ✅       | Any      |
| GET    | `/users/:id`     | Get a user by ID                 |      ✅       | `admin`  |
| PATCH  | `/users/:id`     | Update a user (email/role/active)|      ✅       | `admin`  |
| DELETE | `/users/:id`     | Soft-delete a user               |      ✅       | `admin`  |
| POST   | `/users/:id/restore` | Restore a soft-deleted user  |      ✅       | `admin`  |

#### Deletion is reversible

`DELETE /users/:id` sets `deletedAt` and leaves the row in place. The account
stops resolving — `GET /users/:id` answers 404 — and its email address is
released, so anyone (including the original owner) can register with it again.

`POST /users/:id/restore` brings the account back. If the address was claimed
in the meantime the restore is refused with 409, since two live accounts
cannot share one: uniqueness is enforced by a partial index over rows where
`deletedAt IS NULL`.

### Audit (`/audit`)

| Method | Endpoint               | Description                              | Auth Required | Role    |
|--------|------------------------|------------------------------------------|:-------------:|---------|
| GET    | `/audit/logs`          | Query the audit trail (paginated)        |      ✅       | `admin` |
| GET    | `/audit/failed-logins` | Failed attempts per address, busiest first|      ✅       | `admin` |

`/audit/logs` accepts `action`, `status`, `userId`, `userEmail`, `from`, `to`
(ISO 8601), `page` and `limit` (max 200). `/audit/failed-logins` accepts
`hours`, capped at 168.

The trail is append-only: there is no route that edits or deletes an entry.
Both routes are admin-only — the trail records who signed in from where and
whose role changed.

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/v1/audit/logs?action=login&status=failure&limit=20"
```

### Service (`/`, `/health`)

| Method | Endpoint            | Description                                | Auth Required |
|--------|---------------------|--------------------------------------------|:-------------:|
| GET    | `/`                 | Service metadata and entry points          |      ❌       |
| GET    | `/health`           | Full check — database and heap             |      ❌       |
| GET    | `/health/liveness`  | Is the process responsive? (no dependencies)|      ❌       |
| GET    | `/health/readiness` | Can it serve traffic? (checks the database)|      ❌       |

Health endpoints are exempt from rate limiting so probes never report the
service unhealthy for polling too often. Point an orchestrator's liveness
probe at `/health/liveness` and its readiness probe at `/health/readiness`:
a database outage should pull a replica out of the load balancer, not restart
it in a loop.

### Request & Response Examples

<details>
<summary><strong>POST /auth/register</strong></summary>

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```
</details>

<details>
<summary><strong>POST /auth/login</strong></summary>

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```
</details>

<details>
<summary><strong>GET /users/profile</strong></summary>

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "role": "user",
  "isActive": true,
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-01T10:00:00.000Z"
}
```
</details>

---

## 🔄 Authentication Flow

```
┌─────────┐          ┌──────────┐          ┌────────────┐
│  Client │          │   API    │          │  Database  │
└────┬────┘          └────┬─────┘          └─────┬──────┘
     │  POST /auth/login  │                      │
     │───────────────────▶│  Validate credentials│
     │                    │─────────────────────▶│
     │                    │◀─────────────────────│
     │                    │  Hash refresh token   │
     │                    │─────────────────────▶│
     │   access_token +   │                      │
     │   refresh_token    │                      │
     │◀───────────────────│                      │
     │                    │                      │
     │  GET /users/profile│                      │
     │  + Bearer token    │                      │
     │───────────────────▶│  Verify JWT          │
     │                    │  Extract user data   │
     │   User profile     │                      │
     │◀───────────────────│                      │
     │                    │                      │
     │  POST /auth/logout │                      │
     │  + Bearer token    │                      │
     │───────────────────▶│  Remove refresh token│
     │                    │─────────────────────▶│
     │   Success          │                      │
     │◀───────────────────│                      │
```

**Token Lifecycle:**
1. **Register/Login** → Receive `access_token` (15min) + `refresh_token` (7 days).
2. **Access protected routes** → Send `access_token` in `Authorization: Bearer <token>` header.
3. **Token expired** → Call `/auth/refresh` with the `refresh_token` to get new tokens.
4. **Logout** → Call `/auth/logout` to invalidate the refresh token.

---

## 📖 API Documentation (Swagger)

Once the application is running, access the interactive Swagger UI at:

```
http://localhost:3000/api/docs
```

From Swagger, you can:
- Browse all available endpoints
- See request/response schemas
- Test endpoints directly in the browser
- Authenticate using the **Authorize** button (Bearer token)

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate a coverage report and enforce the thresholds
npm run test:cov

# Lint and formatting, exactly as CI runs them
npm run lint:check
npm run format:check
```

### End-to-end tests

These need a real database:

```bash
docker compose up -d db
npm run test:e2e
```

They run against `synchronize` in development. CI runs them with
`NODE_ENV=test` after `npm run migration:run`, so the suite exercises the
schema the migrations actually produce — a migration that drifts from the
entities fails there rather than on a deploy.

`npm run test:cov` enforces per-file coverage floors on the security-critical
services (auth, users, audit, and the exception filter). A change that drops
their coverage fails the build.

### Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to
`main` and on every pull request: lint and formatting, a production build,
unit tests across Node 20 and 22, and the e2e suite against a PostgreSQL
service container.

---

## 📂 Project Structure

```
api-auth-management/
├── src/
│   ├── auth/                        # Authentication module
│   │   ├── decorators/              # Custom decorators (CurrentUser, Roles)
│   │   ├── dto/                     # Data Transfer Objects (Login, Register, Refresh)
│   │   ├── guards/                  # Auth guards (JWT, Roles)
│   │   ├── strategies/              # Passport strategies (JWT)
│   │   ├── auth.controller.ts       # Auth route handlers
│   │   ├── auth.module.ts           # Auth module definition
│   │   └── auth.service.ts          # Auth business logic
│   │
│   ├── users/                       # Users module
│   │   ├── entities/                # TypeORM entities (User)
│   │   ├── users.controller.ts      # User route handlers
│   │   ├── users.module.ts          # Users module definition
│   │   └── users.service.ts         # User business logic
│   │
│   ├── config/                      # App configuration
│   │   └── configuration.ts         # Environment variables mapping
│   │
│   ├── database/                    # Database module
│   │   └── database.module.ts       # TypeORM connection setup
│   │
│   ├── app.module.ts                # Root application module
│   ├── app.controller.ts            # Root controller
│   ├── app.service.ts               # Root service
│   └── main.ts                      # Application entry point
│
├── test/                            # E2E tests
├── .env                             # Environment variables (not committed)
├── .gitignore                       # Git ignore rules
├── nest-cli.json                    # NestJS CLI configuration
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # Project documentation
```

---

## 📝 Available Scripts

| Script             | Description                              |
|--------------------|------------------------------------------|
| `npm run start`    | Start the application                    |
| `npm run start:dev`| Start in development mode (hot-reload)   |
| `npm run start:debug`| Start in debug mode                    |
| `npm run start:prod`| Start in production mode                |
| `npm run build`    | Build the project                        |
| `npm run format`   | Format code with Prettier                |
| `npm run lint`     | Lint & fix with ESLint                   |
| `npm run test`     | Run unit tests                           |
| `npm run test:e2e` | Run end-to-end tests                     |
| `npm run test:cov` | Run tests with coverage report           |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by <strong>Del'or Mutaliko</strong> using <a href="https://nestjs.com/" target="_blank">NestJS</a>
</p>
