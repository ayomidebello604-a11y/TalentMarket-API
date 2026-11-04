# ⚽ TalentMarket API

> A robust, type-safe RESTful API for scouting football talent, managing player profiles, and handling authentication with role-based permissions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-black?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1?style=for-the-badge&logo=zod&logoColor=white)](https://zod.dev/)
[![Argon2](https://img.shields.io/badge/Argon2-Password%20Hashing-brightgreen?style=for-the-badge)](https://github.com/ranisalt/node-argon2)
[![Jose](https://img.shields.io/badge/Jose-JWT-orange?style=for-the-badge)](https://github.com/panva/jose)

---

## 📖 Overview

**TalentMarket** is a backend service designed to connect emerging football players with scouts and agents. It features a clean 3-tier / layered architecture, secure authentication using **Argon2** and **Jose JWT**, strict input validation via **Zod**, and PostgreSQL connection pooling.

---

## 🏗️ Architecture & Project Structure

The project follows the standard **Controller-Service-Repository** pattern to ensure separation of concerns, testability, and maintainability:

```
TalentMarket/
├── src/
│   ├── config/             # Database connection pool setup (pg)
│   │   └── database.ts
│   ├── controllers/        # Request handling and HTTP response orchestration
│   │   ├── auth.controller.ts
│   │   └── player.controller.ts
│   ├── errors/             # Custom application error classes
│   │   └── AppError.ts
│   ├── middlewares/        # Authentication & request validation middlewares
│   │   ├── auth.validation.ts
│   │   └── player.validation.ts
│   ├── repositories/       # Direct SQL queries and DB interaction
│   │   ├── auth.repository.ts
│   │   └── player.repository.ts
│   ├── routes/             # Express route definitions
│   │   ├── auth.route.ts
│   │   └── player.route.ts
│   ├── schemas/            # Zod validation schemas and inferred types
│   │   ├── auth.schema.ts
│   │   └── user.schema.ts
│   ├── services/           # Business logic and cross-entity operations
│   │   ├── auth.service.ts
│   │   └── player.service.ts
│   ├── types/              # Ambient TypeScript declarations and types
│   │   ├── auth.type.ts
│   │   └── express.d.ts
│   ├── utils/              # Helper utilities (JWT generation & password hashing)
│   │   ├── jwt.ts
│   │   └── password.ts
│   ├── app.ts              # Express application setup, middlewares, and error handlers
│   └── index.ts            # Server listener entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Flow of a Request
$$\text{Client} \longrightarrow \text{Routes} \longrightarrow \text{Middlewares (Auth + Zod)} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Repository} \longrightarrow \text{PostgreSQL}$$

---

## 🗄️ Database Design

### `users` Table
Stores authentication credentials and user roles.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique user identifier |
| `name` | `VARCHAR` | `NOT NULL` | Full name of the user |
| `email` | `VARCHAR` | `UNIQUE`, `NOT NULL` | User email address |
| `password_hash`| `TEXT` | `NOT NULL` | Argon2 hashed password |
| `user_type` / `role` | `VARCHAR` | `NOT NULL` | Role: `"player"`, `"scout"`, `"admin"` |

### `players` Table
Stores extended scouting profile metrics for player accounts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `player_id` | `UUID` | `PRIMARY KEY`, `REFERENCES users(user_id) ON DELETE CASCADE` | Matches owner's `user_id` |
| `position` | `VARCHAR` | `NOT NULL` | Position: `"gk"`, `"def"`, `"mid"`, `"fwd"` |
| `ratings` | `INTEGER` | `CHECK (ratings BETWEEN 49 AND 100)` | Scouting rating (49 – 100) |
| `contact_details` | `VARCHAR` | `NOT NULL` | Phone number or contact handle |

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js** (v20+ recommended)
* **PostgreSQL** instance running locally or hosted

### 2. Installation
```bash
git clone <repository-url>
cd TalentMarket
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_chars

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=talentmarket
```

### 4. Build & Run
```bash
# Compile TypeScript
npm run build

# Start compiled server
npm start
```

---

## 📡 API Reference

All protected routes require the authorization header:
```http
Authorization: Bearer <your_jwt_token>
```

---

### 🔐 Authentication Endpoints (`/api/users`)

#### 1. Register a User
* **Endpoint:** `POST /api/users/register`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "name": "Alex Iwobi",
    "email": "alex@example.com",
    "password": "Password123!",
    "userType": "player"
  }
  ```
* **Success Response (201):**
  ```json
  {
    "message": "User registered successfully",
    "newUser": {
      "user_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
      "name": "Alex Iwobi",
      "email": "alex@example.com",
      "user_type": "player"
    }
  }
  ```

#### 2. Login User
* **Endpoint:** `POST /api/users/login`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
* **Success Response (200):**
  ```json
  {
    "message": "User logged in successfully",
    "user": {
      "user_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
      "email": "alex@example.com",
      "role": "player"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 3. Update User Info
* **Endpoint:** `PUT /api/users/update`
* **Access:** Protected (`Bearer Token`)
* **Request Body:**
  ```json
  {
    "name": "Alexander Iwobi",
    "email": "alex.iwobi@example.com"
  }
  ```

#### 4. Delete User Account
* **Endpoint:** `DELETE /api/users/:id`
* **Access:** Protected (`Bearer Token`)

---

### 🏃‍♂️ Players Endpoints (`/api/players`)

#### 1. Get All Players
* **Endpoint:** `GET /api/players`
* **Access:** Protected (`Bearer Token`)
* **Response (200):**
  ```json
  [
    {
      "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
      "position": "mid",
      "ratings": 86,
      "contact_details": "+2348012345678",
      "name": "Alex Iwobi"
    }
  ]
  ```

#### 2. Create Player Profile
* **Endpoint:** `POST /api/players`
* **Access:** Protected (`Bearer Token`)
* **Validation Rules:**
  * `position`: `"gk" | "def" | "mid" | "fwd"`
  * `ratings`: Integer between `49` and `100`
  * `contactDetails`: String between `11` and `30` characters
* **Request Body:**
  ```json
  {
    "position": "mid",
    "ratings": 86,
    "contactDetails": "+2348012345678"
  }
  ```
* **Response (201):**
  ```json
  {
    "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
    "position": "mid",
    "ratings": 86,
    "contact_details": "+2348012345678"
  }
  ```

#### 3. Search Player by Name
* **Endpoint:** `GET /api/players/name?name=Alex`
* **Access:** Protected (`Bearer Token`)
* **Query Parameters:** `name` *(string, required)*

#### 4. Filter Players by Position
* **Endpoint:** `GET /api/players/position?position=fwd`
* **Access:** Protected (`Bearer Token`)
* **Query Parameters:** `position` *(string, required: `gk`, `def`, `mid`, `fwd`)*

#### 5. Update Player Profile
* **Endpoint:** `PUT /api/players`
* **Access:** Protected (`Bearer Token`)
* **Request Body (all fields optional):**
  ```json
  {
    "ratings": 89,
    "contactDetails": "+2348099887766"
  }
  ```

#### 6. Delete Player Profile
* **Endpoint:** `DELETE /api/players`
* **Access:** Protected (`Bearer Token`)
* **Permissions & Ownership:**
  * **Regular User:** Automatically deletes the user's own profile based on their token ID.
  * **Admin:** Can delete any profile by providing `?playerId=<target_uuid>`.

---

## 🛡️ Error Handling

Errors follow a uniform JSON schema handled centrally by `errorHandler` in `src/app.ts`:

```json
{
  "message": "Please check your player details: Ratings: Number must be greater than or equal to 49"
}
```

| HTTP Status | Meaning | Scenario |
| :--- | :--- | :--- |
| `400 Bad Request` | Validation failure / malformed JSON | Invalid schema inputs |
| `401 Unauthorized`| Missing / invalid JWT token | Token missing or expired |
| `403 Forbidden`   | Insufficient permissions | User attempting to delete someone else's profile |
| `404 Not Found`   | Resource not found | Profile or user ID does not exist |
| `409 Conflict`    | Duplicate resource | Profile already created for user |
| `500 Server Error`| Internal unhandled error | Database connection failure |

---

## 📜 License

This project is licensed under the **ISC License**.

