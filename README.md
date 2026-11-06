# ⚽ TalentMarket API

> A robust, type-safe RESTful API for scouting football talent, managing player and scout profiles, and handling authentication with role-based permissions.

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
│   │   ├── player.controller.ts
│   │   ├── scout.controller.ts
│   │   └── scout-player.controller.ts
│   ├── errors/             # Custom application error classes
│   │   └── AppError.ts
│   ├── middlewares/        # Authentication & request validation middlewares
│   │   ├── auth.validation.ts
│   │   ├── player.validation.ts
│   │   ├── scout.validation.ts
│   │   └── uuid.validation.ts
│   ├── repositories/       # Direct SQL queries and DB interaction
│   │   ├── auth.repository.ts
│   │   ├── player.repository.ts
│   │   ├── scout.repository.ts
│   │   └── scout-player.repository.ts
│   ├── routes/             # Express route definitions
│   │   ├── auth.route.ts
│   │   ├── player.route.ts
│   │   ├── scout.route.ts
│   │   └── scout-player.route.ts
│   ├── schemas/            # Zod validation schemas and inferred types
│   │   ├── auth.schema.ts
│   │   └── user.schema.ts
│   ├── services/           # Business logic and cross-entity operations
│   │   ├── auth.service.ts
│   │   ├── player.service.ts
│   │   ├── scout.service.ts
│   │   └── scout-player.service.ts
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
$$\text{Client} \longrightarrow \text{Routes} \longrightarrow \text{Middlewares (Auth + Zod + UUID)} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Repository} \longrightarrow \text{PostgreSQL}$$

---

## 🗄️ Database Design

### `users` Table
Stores authentication credentials and user types.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique user identifier |
| `name` | `VARCHAR` | `NOT NULL` | Full name of the user |
| `email` | `VARCHAR` | `UNIQUE`, `NOT NULL` | User email address |
| `password_hash`| `TEXT` | `NOT NULL` | Argon2 hashed password |
| `user_type` | `VARCHAR` | `NOT NULL` | Account type: `"player"`, `"scout"`, `"admin"` |

### `players` Table
Stores extended scouting profile metrics for player accounts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `player_id` | `UUID` | `PRIMARY KEY`, `REFERENCES users(user_id) ON DELETE CASCADE` | Matches owner's `user_id` |
| `position` | `VARCHAR` | `NOT NULL` | Position: `"gk"`, `"def"`, `"mid"`, `"fwd"` |
| `ratings` | `INTEGER` | `CHECK (ratings BETWEEN 49 AND 100)` | Scouting rating (49 – 100) |
| `contact_details` | `VARCHAR` | `NOT NULL` | Phone number or contact handle |

### `scouts` Table
Stores profile details for scout accounts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `scout_id` | `UUID` | `PRIMARY KEY`, `REFERENCES users(user_id) ON DELETE CASCADE` | Matches owner's `user_id` |
| `contact_details` | `VARCHAR` | `NOT NULL` | Phone number or organization contact |

### `scout_players` Table *(Many-to-Many Join Table)*
Links scouts to the players they are tracking.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `scout_id` | `UUID` | `REFERENCES scouts(scout_id) ON DELETE CASCADE` | The scout doing the scouting |
| `player_id` | `UUID` | `REFERENCES players(player_id) ON DELETE CASCADE` | The player being scouted |
| — | — | `PRIMARY KEY (scout_id, player_id)` | Prevents duplicate scout-player pairs |

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

#### 1. Register a User (Player or Scout)
* **Endpoint:** `POST /api/users/register`
* **Access:** Public
* **Request Body (Player):**
  ```json
  {
    "name": "Victor Osimhen",
    "email": "victor@example.com",
    "password": "Password123!",
    "userType": "player"
  }
  ```
* **Request Body (Scout):**
  ```json
  {
    "name": "Mikel Arteta",
    "email": "mikel@arsenal.com",
    "password": "Password123!",
    "userType": "scout"
  }
  ```
* **Success Response (201):** *(Password hash is stripped from response)*
  ```json
  {
    "message": "User registered successfully",
    "newUser": {
      "user_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
      "name": "Victor Osimhen",
      "email": "victor@example.com",
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
    "email": "victor@example.com",
    "password": "Password123!"
  }
  ```
* **Success Response (200):** *(Returns JWT token and user info without password hash)*
  ```json
  {
    "message": "User logged in successfully",
    "user": {
      "user_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
      "email": "victor@example.com",
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
    "name": "Victor James Osimhen",
    "email": "victor.osimhen@example.com"
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
* **Response (200):** *(Includes player profile details with `name` and `email` from users)*
  ```json
  [
    {
      "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
      "position": "fwd",
      "ratings": 88,
      "contact_details": "+2348012345678",
      "name": "Victor Osimhen",
      "email": "victor@example.com"
    }
  ]
  ```

#### 2. Create Player Profile
* **Endpoint:** `POST /api/players`
* **Access:** Protected (`Bearer Token` — must be registered as `player`)
* **Validation Rules:**
  * `position`: `"gk" | "def" | "mid" | "fwd"`
  * `ratings`: Integer between `49` and `100`
  * `contactDetails`: String between `11` and `30` characters
* **Request Body:**
  ```json
  {
    "position": "fwd",
    "ratings": 88,
    "contactDetails": "+2348012345678"
  }
  ```
* **Response (201):**
  ```json
  {
    "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
    "position": "fwd",
    "ratings": 88,
    "contact_details": "+2348012345678"
  }
  ```

#### 3. Search Player by Name
* **Endpoint:** `GET /api/players/name?name=Victor`
* **Access:** Protected (`Bearer Token`)
* **Query Parameters:** `name` *(string, required — matches partial names case-insensitively)*

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
    "ratings": 91,
    "contactDetails": "+2348099887766"
  }
  ```

#### 6. Delete Player Profile
* **Endpoint:** `DELETE /api/players`
* **Access:** Protected (`Bearer Token`)
* **Permissions & Ownership:**
  * **Regular Player:** Automatically deletes the user's own profile based on their token ID.
  * **Admin:** Can delete any profile by providing `?playerId=<target_uuid>`.

---

### 🕵️‍♂️ Scouts Endpoints (`/api/scouts`)

#### 1. Get All Scouts
* **Endpoint:** `GET /api/scouts`
* **Access:** Protected (`Bearer Token`)
* **Response (200):** *(Includes scout details with `name` and `email` from users)*
  ```json
  {
    "status": "success",
    "scouts": [
      {
        "scout_id": "e4b2a1c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
        "contact_details": "+447123456789",
        "name": "Mikel Arteta",
        "email": "mikel@arsenal.com"
      }
    ]
  }
  ```

#### 2. Create Scout Profile
* **Endpoint:** `POST /api/scouts`
* **Access:** Protected (`Bearer Token` — must be registered as `scout`)
* **Validation Rules (Strict):**
  * `contactDetails`: String between `11` and `30` characters
  * *Extra unrecognized keys are strictly rejected*
* **Request Body:**
  ```json
  {
    "contactDetails": "+447123456789"
  }
  ```
* **Response (201):**
  ```json
  {
    "status": "success",
    "scout": {
      "scout_id": "e4b2a1c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
      "contact_details": "+447123456789"
    }
  }
  ```

#### 3. Get Scout by ID
* **Endpoint:** `GET /api/scouts/:scoutId`
* **Access:** Protected (`Bearer Token`)
* **Response (200):**
  ```json
  {
    "status": "success",
    "scout": {
      "user_scout": {
        "user_id": "e4b2a1c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
        "name": "Mikel Arteta",
        "email": "mikel@arsenal.com",
        "user_type": "scout"
      },
      "scoutDetails": "+447123456789"
    }
  }
  ```

#### 4. Update Scout Contact Details
* **Endpoint:** `PUT /api/scouts/:scoutId`
* **Access:** Protected (`Bearer Token` — only the scout themselves or an admin can update)
* **Request Body:**
  ```json
  {
    "contactDetails": "+447998877665"
  }
  ```
* **Response (200):**
  ```json
  {
    "status": "success",
    "scout": {
      "scout_id": "e4b2a1c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
      "contact_details": "+447998877665"
    }
  }
  ```

---

### 🔗 Scout-Player Endpoints (`/api/scouts/players`)

> Manages the many-to-many scouting relationship between scouts and players. All endpoints require a valid Bearer token. Endpoints that write or read scout-specific data require the authenticated user to be a **scout**.

#### 1. Scout a Player
* **Endpoint:** `POST /api/scouts/players/:playerId`
* **Access:** Protected (`Bearer Token` — must be registered as `scout`)
* **URL Params:** `playerId` *(UUID of the player to scout)*
* **Request Body:** None — `scoutId` is read from the JWT, `playerId` from the URL
* **Response (201):**
  ```json
  {
    "message": "Player scouted successfully",
    "scoutingDetails": {
      "scout_id": "e4b2a1c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
      "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3"
    }
  }
  ```

#### 2. Get All Players I Am Scouting
* **Endpoint:** `GET /api/scouts/players`
* **Access:** Protected (`Bearer Token` — scout's own list)
* **Response (200):**
  ```json
  {
    "players": [
      { "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3" }
    ]
  }
  ```

#### 3. Get All Scouts for a Player
* **Endpoint:** `GET /api/scouts/players/:playerId/scouts`
* **Access:** Protected (`Bearer Token`)
* **URL Params:** `playerId` *(UUID of the player)*
* **Response (200):**
  ```json
  {
    "scouts": [
      { "scout_id": "e4b2a1c0-1d2e-3f4a-5b6c-7d8e9f0a1b2c" }
    ]
  }
  ```

#### 4. Remove a Player from Scout List
* **Endpoint:** `DELETE /api/scouts/players/:playerId`
* **Access:** Protected (`Bearer Token` — must be registered as `scout`)
* **URL Params:** `playerId` *(UUID of the player to remove)*
* **Request Body:** None
* **Response (200):**
  ```json
  {
    "message": "Player removed from scout's list",
    "result": {
      "player_id": "c1f7a0b2-3c4d-4e5f-a6b7-c8d9e0f1a2b3"
    }
  }
  ```

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
| `400 Bad Request` | Validation failure / malformed JSON | Invalid schema inputs or extra unexpected keys |
| `401 Unauthorized`| Missing / invalid JWT token | Token missing or expired |
| `403 Forbidden`   | Insufficient permissions | Role mismatch or updating/deleting someone else's profile |
| `404 Not Found`   | Resource not found | Profile or user ID does not exist |
| `409 Conflict`    | Duplicate resource | Profile already created for user / player already scouted |
| `500 Server Error`| Internal unhandled error | Database connection failure |

---

## 📜 License

This project is licensed under the **ISC License**.
