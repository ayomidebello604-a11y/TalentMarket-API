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

**TalentMarket** is a backend service designed to connect emerging football players with scouts and agents. It features a clean layered architecture, secure authentication using **Argon2**, **Jose JWT**, and **Google OAuth 2.0**, strict input validation via **Zod**, and PostgreSQL connection pooling.

Users can register or sign in with email and password, or authenticate with Google. The platform supports player and scout profiles, scout-player relationships, and role-based access control.

---

## 🏗️ Architecture & Project Structure

The project follows the **Controller-Service-Repository** pattern to ensure separation of concerns, testability, and maintainability:

```
TalentMarket-API/
├── src/
│   ├── config/                 # Database, security, and OAuth configuration
│   │   ├── database.ts
│   │   ├── google-oauth.ts
│   │   └── security.ts
│   ├── controllers/            # Request handling and HTTP response orchestration
│   │   ├── auth.controller.ts
│   │   ├── player.controller.ts
│   │   ├── scout.controller.ts
│   │   └── scout-player.controller.ts
│   ├── errors/                 # Custom application error classes
│   │   └── AppError.ts
│   ├── middlewares/            # Authentication, validation, and request logging
│   ├── repositories/           # Parameterized SQL queries and database interaction
│   ├── routes/                 # Express route definitions
│   ├── schemas/                # Zod validation schemas and inferred types
│   ├── services/               # Business logic and cross-entity operations
│   │   ├── auth.service.ts
│   │   ├── google-oauth.service.ts
│   │   ├── player.service.ts
│   │   ├── scout.service.ts
│   │   └── scout-player.service.ts
│   ├── types/                  # Ambient TypeScript declarations and types
│   ├── utils/                  # JWT generation and password hashing
│   │   ├── jwt.ts
│   │   └── password.ts
│   ├── app.ts                  # Express application setup and error handlers
│   └── index.ts                # Server listener entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Flow of a Request

`Client → Routes → Middlewares (Authentication + Validation) → Controller → Service → Repository → PostgreSQL`

---

## 🗄️ Database Design

The API currently uses PostgreSQL through the `pg` package and parameterized SQL queries.

### `users` Table

Stores account details and authentication information.

| Column | Purpose |
| :--- | :--- |
| `user_id` | Unique user identifier (UUID) |
| `name` | Full name |
| `email` | User email address |
| `password_hash` | Argon2 password hash; Google-created accounts do not use password authentication |
| `google_id` | Google account identifier used by Google OAuth |
| `user_type` | Account type: `player` or `scout` |
| `role` | Authorization role used when generating JWTs |

The repository queries expect the `google_id` and `role` fields to be available. The password hash may be absent for accounts created through Google OAuth.

### `players` Table

Stores extended scouting profile details for player accounts. The `player_id` identifies the corresponding user account.

| Column | Purpose |
| :--- | :--- |
| `player_id` | Player profile identifier linked to the user's ID |
| `position` | `gk`, `def`, `mid`, or `fwd` |
| `ratings` | Scouting rating from 49 to 100 |
| `contact_details` | Phone number or contact handle |

### `scouts` Table

Stores profile details for scout accounts.

| Column | Purpose |
| :--- | :--- |
| `scout_id` | Scout profile identifier linked to the user's ID |
| `contact_details` | Phone number or organization contact |

### `scout_players` Table

Many-to-many join table linking scouts to the players they are tracking. The repository uses the `scout_id` and `player_id` pair to identify each relationship and prevent duplicate entries.

### `refresh_tokens` Table

Stores hashed refresh tokens for persistent sessions. The API uses `session_id`, `user_id`, `token_hash`, `expires_at`, and `revoked_at`. Raw refresh tokens are not stored in this table. Refresh rotates the token, while logout revokes it.

---

## 🚀 Getting Started

### 1. Prerequisites

* **Node.js** (v20+ recommended)
* **PostgreSQL** instance running locally or hosted
* **Google Cloud project** with OAuth 2.0 credentials (only required for Google sign-in)

### 2. Installation

```bash
git clone https://github.com/ayomidebello604-a11y/TalentMarket-API.git
cd TalentMarket-API
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# JWT
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_chars

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=talentmarket

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/google/callback
```

Configure the same callback URL in your Google Cloud OAuth client. The server currently listens on port `3000`; it does not read a `PORT` environment variable. CORS is configured for `http://localhost:5173` in `src/config/security.ts`; update that origin if your frontend uses a different URL.

### 4. Build & Run

```bash
# Compile TypeScript
npm run build

# Start compiled server
npm start
```

---

## 📡 API Reference

### Authentication, Sessions, and Rate Limits

Base path: `/api/users`

| Method | Path | Purpose | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a player or scout with email and password | Public; rate-limited |
| `POST` | `/login` | Sign in with email and password and create a session | Public; rate-limited |
| `GET` | `/google?user_type=player` | Start Google OAuth as a player | Public |
| `GET` | `/google?user_type=scout` | Start Google OAuth as a scout | Public |
| `GET` | `/google/callback` | Handle Google's OAuth callback | OAuth state cookie |
| `POST` | `/refresh` | Rotate refresh token and issue a new access token | Valid `refreshToken` cookie |
| `POST` | `/logout` | Revoke the refresh-token session and clear its cookie | Access token and valid refresh-token cookie |
| `PUT` | `/update` | Update the authenticated user's name and email | Access token |
| `DELETE` | `/:id` | Delete a user account | Admin access token |

Login and registration limits are 100 and 50 requests per IP, respectively. Their windows are 15 and 30 minutes. Access tokens expire after 20 minutes; refresh tokens expire after 24 hours and rotate on refresh.

Send JSON request bodies with `Content-Type: application/json`. Use the access token returned by login as `Authorization: Bearer <access_token>`. Password login and Google OAuth set an `HttpOnly` `refreshToken` cookie. Keep your API client's cookie jar enabled for refresh and logout. Password login also includes the refresh token in its JSON response; the Google callback does not return the raw refresh token in its JSON response.

All protected routes require:

```http
Authorization: Bearer <your_access_token>
```

#### 1. Register a User

* **Endpoint:** `POST /api/users/register`
* **Access:** Public
* **Request Body:**

```json
{
  "name": "Victor Osimhen",
  "email": "victor@example.com",
  "password": "Password123!",
  "userType": "player"
}
```

Use `"scout"` as `userType` when registering a scout. Registration accepts `player` and `scout`; it does not expose public admin registration.

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

A successful login returns the user details and an access token, and sets the refresh-token cookie.

#### 3. Google OAuth

* **Start Endpoint:** `GET /api/users/google?user_type=player` or `GET /api/users/google?user_type=scout`
* **Callback Endpoint:** `GET /api/users/google/callback`
* **Access:** Public

The flow redirects the user to Google for authentication. The API generates a random OAuth state value and stores it with the selected account type in short-lived, HTTP-only cookies. On callback, it checks the returned state, exchanges the authorization code, verifies the Google ID token, and checks that Google's email is verified.

For a new Google account, the selected account type is used to create the user. If the email already belongs to an account that is not linked to that Google ID, the API returns a conflict instead of automatically linking the accounts. An existing Google-linked account can sign in through the same flow.

A successful callback returns the user details, access token, session information, and expiry information, and sets the refresh-token cookie.

#### 4. Refresh Access Token

* **Endpoint:** `POST /api/users/refresh`
* **Access:** Valid refresh-token cookie
* **Request Body:** None

The refresh token is read from the `refreshToken` cookie. A successful request rotates the refresh token and returns a new access token.

#### 5. Logout

* **Endpoint:** `POST /api/users/logout`
* **Access:** Protected; requires an access token and refresh-token cookie

The endpoint revokes the refresh-token session and clears the cookie.

#### 6. Update User Info

* **Endpoint:** `PUT /api/users/update`
* **Access:** Protected (`Bearer Token`)
* **Request Body:**

```json
{
  "name": "Victor James Osimhen",
  "email": "victor.osimhen@example.com"
}
```

#### 7. Delete User Account

* **Endpoint:** `DELETE /api/users/:id`
* **Access:** Admin only

---

### 🏃‍♂️ Players Endpoints (`/api/players`)

All player endpoints require an access token.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/` | Get all player profiles |
| `POST` | `/` | Create the authenticated user's player profile |
| `GET` | `/name?name=Victor` | Search players by name |
| `GET` | `/position?position=fwd` | Filter players by position |
| `PUT` | `/` | Update the authenticated user's player profile |
| `DELETE` | `/` | Delete a player profile |

#### Create Player Profile

* **Access:** Authenticated player or admin
* **Validation Rules:**
  * `position`: `gk`, `def`, `mid`, or `fwd`
  * `ratings`: Integer between 49 and 100
  * `contactDetails`: String between 11 and 30 characters

```json
{
  "position": "fwd",
  "ratings": 88,
  "contactDetails": "+2348012345678"
}
```

The profile ID is taken from the authenticated user's token.

#### Update Player Profile

* **Access:** Authenticated user
* **Request Body:** All profile fields are optional.

```json
{
  "ratings": 91,
  "contactDetails": "+2348099887766"
}
```

#### Delete Player Profile

* **Access:** Player or admin
* **Ownership:** A player deletes their own profile. An admin can provide the target `playerId` as a query parameter.

Example: `DELETE /api/players?playerId=<player_uuid>`

---

### 🕵️‍♂️ Scouts Endpoints (`/api/scouts`)

All scout endpoints require an access token.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/` | Get all scout profiles |
| `POST` | `/` | Create the authenticated user's scout profile |
| `GET` | `/:scoutId` | Get a scout by ID |
| `PUT` | `/:scoutId` | Update scout contact details |
| `DELETE` | `/:scoutId` | Delete a scout profile |

#### Create Scout Profile

* **Access:** Authenticated scout or admin
* **Validation:** `contactDetails` must be a string between 11 and 30 characters. Extra fields are rejected.

```json
{
  "contactDetails": "+447123456789"
}
```

#### Update Scout Contact Details

* **Endpoint:** `PUT /api/scouts/:scoutId`
* **Access:** The scout themselves or an admin
* **Request Body:**

```json
{
  "contactDetails": "+447998877665"
}
```

#### Delete Scout Profile

* **Endpoint:** `DELETE /api/scouts/:scoutId`
* **Access:** Route allows a scout or admin access token.

---

### 🔗 Scout-Player Endpoints (`/api/scout-players`)

All routes require a valid access token. These endpoints manage the many-to-many relationship between scouts and players.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/:playerId` | Add a player to the authenticated scout's list |
| `GET` | `/` | Get the authenticated user's scouting list |
| `GET` | `/:playerId/scouts` | Get scouts associated with a player |
| `DELETE` | `/:playerId` | Remove a player from the authenticated scout's list |

#### 1. Scout a Player

* **Endpoint:** `POST /api/scout-players/:playerId`
* **Access:** Authenticated scout account
* **Request Body:** None. The scout ID comes from the access token and the player ID comes from the URL.

#### 2. Get Scouted Players

* **Endpoint:** `GET /api/scout-players/`
* **Access:** Authenticated user
* **Response:** Returns the players associated with the authenticated user's ID.

#### 3. Get Scouts for a Player

* **Endpoint:** `GET /api/scout-players/:playerId/scouts`
* **Access:** Authenticated user

#### 4. Remove a Player from a Scout's List

* **Endpoint:** `DELETE /api/scout-players/:playerId`
* **Access:** The route accepts scout or admin roles. The service currently verifies that the authenticated account is a scout before removing the relationship.

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
| `401 Unauthorized` | Missing or invalid authentication | Missing, invalid, or expired access/refresh token |
| `403 Forbidden` | Insufficient permissions | Role mismatch or attempting an operation without permission |
| `404 Not Found` | Resource not found | Profile or user ID does not exist |
| `409 Conflict` | Duplicate resource or account conflict | Profile already exists, player already scouted, or email already belongs to a non-Google-linked account |
| `429 Too Many Requests` | Rate limit exceeded | Login or registration request limit exceeded |
| `500 Server Error` | Internal unhandled error | Unexpected server or database error |

---

## 📜 License

This project is licensed under the **ISC License**.
