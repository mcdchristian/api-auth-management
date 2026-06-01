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
- **Password Security** — Passwords hashed with **bcrypt** (salt rounds: 10).
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

Create a PostgreSQL database:

```sql
CREATE DATABASE auth_db;
```

### 4. Configure environment variables

Create a `.env` file at the project root:

```bash
cp .env.example .env   # if .env.example exists, or create manually
```

Fill in the values (see [Environment Variables](#-environment-variables) below).

### 5. Start the server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

| Variable                | Description                        | Default           |
|-------------------------|------------------------------------|--------------------|
| `PORT`                  | Server port                        | `3000`             |
| `DB_HOST`               | PostgreSQL host                    | `localhost`        |
| `DB_PORT`               | PostgreSQL port                    | `5432`             |
| `DB_USERNAME`           | Database username                  | `postgres`         |
| `DB_PASSWORD`           | Database password                  | `postgres`         |
| `DB_NAME`               | Database name                      | `auth_db`          |
| `JWT_SECRET`            | Secret key for access tokens       | —                  |
| `JWT_EXPIRATION`        | Access token lifetime              | `15m`              |
| `JWT_REFRESH_SECRET`    | Secret key for refresh tokens      | —                  |
| `JWT_REFRESH_EXPIRATION`| Refresh token lifetime             | `7d`               |

**Example `.env` file:**

```env
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_NAME=auth_db

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRATION=7d
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

## 📡 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint         | Description               | Auth Required |
|--------|------------------|---------------------------|:-------------:|
| POST   | `/auth/register` | Register a new user       |      ❌       |
| POST   | `/auth/login`    | Login & get tokens        |      ❌       |
| POST   | `/auth/logout`   | Logout (invalidate token) |      ✅       |
| POST   | `/auth/refresh`  | Refresh access token      |      ❌       |

### Users (`/users`)

| Method | Endpoint         | Description                      | Auth Required | Role     |
|--------|------------------|----------------------------------|:-------------:|----------|
| GET    | `/users`         | Get all users                    |      ✅       | `admin`  |
| GET    | `/users/profile` | Get current user's profile       |      ✅       | Any      |

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

# Run end-to-end tests
npm run test:e2e

# Generate coverage report
npm run test:cov
```

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
