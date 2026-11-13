# ⚽ TalentMarket API

A secure, scalable RESTful API for football talent discovery, player management, and scouting. TalentMarket provides authentication, player and scout profiles, scouting relationships, and role-based access control through a modular backend architecture.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-Caching-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1)](https://zod.dev/)

---

## 📖 Overview

TalentMarket is a backend application designed to connect emerging football players with scouts and agents.

The platform provides a centralized system for managing football talent, allowing players to create professional profiles while scouts can discover players, examine their profiles, and maintain lists of players they are tracking.

The API is built with **TypeScript and Express 5**, following a layered architecture that separates HTTP handling, business logic, and database operations.

It supports:

- User registration and authentication using email and password.
- Google OAuth 2.0 authentication.
- Secure password hashing with Argon2.
- JWT-based authentication using Jose.
- Refresh-token sessions with token rotation and revocation.
- Role-based access control.
- Player and scout profile management.
- Scout-player relationship management.
- Input validation using Zod.
- PostgreSQL database integration.
- Prisma ORM for selected database operations.
- Redis caching for player listings.
- Request rate limiting.
- Security headers using Helmet.
- Centralized error handling.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| TypeScript | Static typing and application development |
| Node.js | JavaScript runtime |
| Express 5 | REST API framework |
| PostgreSQL | Primary relational database |
| `pg` | PostgreSQL connection pooling and parameterized queries |
| Prisma 7 | ORM for selected database operations |
| `@prisma/adapter-pg` | PostgreSQL adapter for Prisma |
| Redis | Caching and cache invalidation |
| Jose | JWT creation and verification |
| Argon2 | Password hashing and verification |
| Google Auth Library | Google OAuth 2.0 authentication |
| Zod | Request validation and type inference |
| Helmet | HTTP security headers |
| CORS | Cross-origin resource sharing |
| Express Rate Limit | Login and registration rate limiting |
| Cookie Parser | HTTP cookie parsing |

---

## 🏗️ Architecture and Project Structure

The application follows the **Controller-Service-Repository (CSR)** architecture.

This structure separates responsibilities across different layers, making the codebase easier to maintain, test, debug, and extend.

### Project Structure

```text
TalentMarket-API/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   │
│   ├── config/
│   │   ├── database.ts
│   │   ├── google-oauth.ts
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   └── security.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── player.controller.ts
│   │   ├── scout.controller.ts
│   │   └── scout-player.controller.ts
│   │
│   ├── errors/
│   │   └── AppError.ts
│   │
│   ├── middlewares/
│   │   ├── auth.validation.ts
│   │   ├── player.validation.ts
│   │   ├── scout.validation.ts
│   │   └── logger.middleware.ts
│   │
│   ├── repositories/
│   │   ├── auth.repository.ts
│   │   ├── player.repository.ts
│   │   ├── scout.prisma.repository.ts
│   │   └── scout-player.repository.ts
│   │
│   ├── routes/
│   │   ├── auth.route.ts
│   │   ├── player.route.ts
│   │   ├── scout.route.ts
│   │   └── scout-player.route.ts
│   │
│   ├── schemas/
│   │   ├── auth.schema.ts
│   │   └── user.schema.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── google-oauth.service.ts
│   │   ├── player.service.ts
│   │   ├── scout.service.ts
│   │   └── scout-player.service.ts
│   │
│   ├── types/
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   └── invalidatecache.utils.ts
│   │
│   ├── app.ts
│   └── index.ts
│
├── prisma.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Request Lifecycle

A typical request follows this flow:

```text
Client Request
      |
      v
Express Routes
      |
      v
Middlewares
(Authentication / Validation)
      |
      v
Controller
      |
      v
Service
      |
      v
Repository
      |
      v
PostgreSQL / Prisma
      |
      v
Response to Client
```

**Responsibilities of each layer:**

- **Routes:** Define API endpoints and attach the required middleware.
- **Middlewares:** Handle authentication, authorization, input validation, and request logging.
- **Controllers:** Handle HTTP requests and responses.
- **Services:** Contain application business logic and coordinate operations.
- **Repositories:** Handle database operations using parameterized SQL or Prisma.
- **Config:** Initialize external services, database connections, and security settings.
- **Utils:** Provide reusable functionality such as JWT generation, password hashing, and cache invalidation.

---

## 🗄️ Database Design

TalentMarket uses PostgreSQL as its primary database.

Database operations are handled through two approaches:

1. **Node PostgreSQL (`pg`):** Used for authentication, player profiles, refresh-token sessions, and scout-player relationships.
2. **Prisma ORM:** Used for scout-profile operations through a dedicated repository layer.

Both approaches operate on the same PostgreSQL database.

### Database Models

#### 1. Users

The `users` table stores account information and authentication details.

| Column | Description |
|---|---|
| `user_id` | Unique UUID identifying each user |
| `name` | User's full name |
| `email` | Unique email address |
| `password_hash` | Argon2 password hash; nullable for Google accounts |
| `google_id` | Unique Google account identifier |
| `user_type` | Account type: `player` or `scout` |
| `role` | Authorization role |
| `created_at` | Account creation timestamp |

#### 2. Players

The `players` table stores additional information about football players.

| Column | Description |
|---|---|
| `player_id` | References the corresponding user ID |
| `position` | Football position |
| `ratings` | Player rating |
| `contact_details` | Player contact information |

Supported player positions:

- `gk` – Goalkeeper
- `def` – Defender
- `mid` – Midfielder
- `fwd` – Forward

Player ratings are restricted to integers between 49 and 100.

#### 3. Scouts

The `scouts` table stores additional information about scouts.

| Column | Description |
|---|---|
| `scout_id` | References the corresponding user ID |
| `contact_details` | Scout contact information |

#### 4. Scout Players

The `scout_players` table manages the many-to-many relationship between scouts and players.

A scout can track multiple players, and a player can be associated with multiple scouts.

The table uses a composite primary key consisting of:

- `scout_id`
- `player_id`

Duplicate relationships are prevented through database conflict handling.

#### 5. Refresh Tokens

The `refresh_tokens` table stores refresh-token session information.

| Column | Description |
|---|---|
| `id` | Unique token record identifier |
| `session_id` | Identifies a user session |
| `user_id` | References the account owner |
| `token_hash` | SHA-256 hash of the refresh token |
| `created_at` | Token creation timestamp |
| `expires_at` | Token expiration timestamp |
| `revoked_at` | Indicates whether the token has been revoked |

Raw refresh tokens are generated for clients, while their SHA-256 hashes are stored in the database.

---

## 🔐 Authentication and Authorization

TalentMarket implements authentication using JWTs and refresh-token sessions.

### 1. Password Authentication

Users can register and log in using their email address and password.

Passwords are hashed using **Argon2** before being stored in PostgreSQL.

During login:

1. The API retrieves the user account using the supplied email.
2. Argon2 verifies the supplied password against the stored hash.
3. An access token is generated using Jose.
4. A refresh token is generated using cryptographically secure random bytes.
5. The SHA-256 hash of the refresh token is stored in the database.
6. The refresh token is also set in an HTTP-only cookie.

Google-created accounts without a password hash must authenticate through Google.

### 2. JWT Access Tokens

Access tokens are signed using the HS256 algorithm.

They contain:

- User ID (`sub`)
- User role
- Issued-at timestamp
- Expiration timestamp

**Access-token expiration:** 20 minutes.

Protected routes verify the access token before allowing requests to continue.

Example:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 3. Refresh-Token Rotation

Refresh tokens are used to obtain new access tokens without requiring users to log in repeatedly.

The implementation includes:

- Cryptographically secure refresh-token generation.
- SHA-256 token hashing before database storage.
- Database-backed session tracking.
- Refresh-token expiration after 24 hours.
- Token revocation.
- Refresh-token rotation.

During rotation, the existing token is revoked and a new token is inserted within a PostgreSQL transaction.

The existing session ID is retained throughout token rotation.

The transaction uses `SELECT ... FOR UPDATE` to lock the existing token record while validating and rotating it.

### 4. Logout

Logout revokes the refresh token associated with the current session and clears the refresh-token cookie.

The logout endpoint requires both an access token and a valid refresh-token cookie.

### 5. Google OAuth 2.0

Users can authenticate using their Google accounts.

The OAuth implementation includes:

- Google authorization URL generation.
- Random OAuth state generation.
- Temporary HTTP-only state cookies.
- OAuth state verification.
- Authorization-code exchange.
- Google ID-token verification.
- Email verification checks.
- Google account identification using Google's unique account ID.

Users select their account type when initiating Google authentication:

- `player`
- `scout`

For security, an existing account with the same email address is not automatically linked to a Google account.

---

## 🛡️ Security Features

Security is integrated throughout the application.

| Feature | Implementation |
|---|---|
| Password security | Argon2 |
| Access-token authentication | Jose JWT |
| Refresh-token protection | SHA-256 hashing |
| Session management | Database-backed refresh-token sessions |
| Token rotation | Transactional PostgreSQL operations |
| OAuth protection | Random state validation |
| Input validation | Zod |
| HTTP security headers | Helmet |
| Cross-origin protection | CORS configuration |
| Rate limiting | Express Rate Limit |
| Database query protection | Parameterized SQL queries |
| Cookie protection | HTTP-only cookies |

### Rate Limiting

Login and registration endpoints have separate rate limits.

| Endpoint | Limit | Time Window |
|---|---:|---|
| Login | 100 requests | 15 minutes |
| Registration | 50 requests | 30 minutes |

The current rate-limit configuration uses the default in-memory store.

### Input Validation

Zod validates incoming registration, login, player-profile, and scout-profile data.

Player-profile validation includes:

- Supported football positions.
- Integer ratings between 49 and 100.
- Contact details between 11 and 30 characters.

Scout-profile validation requires contact details between 11 and 30 characters.

Strict validation is applied to player and scout profile creation, rejecting unexpected properties.

---

## ⚡ Redis Caching

Redis is integrated to improve the performance of frequently requested player data.

The application currently caches the result of retrieving all player profiles.

### Cache Configuration

| Property | Value |
|---|---|
| Cache key | `talentmarket:players:all` |
| Expiration | 3600 seconds (1 hour) |
| Cache storage | Redis |
| Cached data | All player profiles |

### Caching Workflow

When a client requests all player profiles:

1. The service checks Redis for the cached result.
2. If the cached data exists, it is returned without querying PostgreSQL.
3. If the cache does not exist or a cache read fails, the service retrieves the data from PostgreSQL.
4. The retrieved data is stored in Redis for subsequent requests.

### Cache Invalidation

Whenever a player profile is successfully created, updated, or deleted, the corresponding cache entry is invalidated.

This ensures that subsequent requests retrieve updated player information rather than outdated cached data.

Redis operations use timeout handling to prevent individual cache requests from waiting indefinitely.

**Note:** Redis is currently initialized during application startup. A running Redis instance is therefore required for the current startup configuration.

---

## 🚀 Getting Started

Follow these instructions to set up and run TalentMarket locally.

### Prerequisites

Make sure the following are installed:

- [Node.js](https://nodejs.org/) (v20 or later recommended)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [Git](https://git-scm.com/)

A Google Cloud project with OAuth 2.0 credentials is also required if you want to use Google authentication.

### 1. Clone the Repository

```bash
git clone https://github.com/ayomidebello604-a11y/TalentMarket-API.git

cd TalentMarket-API
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory.

```env
# Application Environment
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_at_least_32_characters

# PostgreSQL Configuration (pg)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_NAME=Talent_Market

# Prisma PostgreSQL Connection
DATABASE_URL=postgresql://postgres:your_database_password@localhost:5432/Talent_Market

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/google/callback
```

Replace the example values with your actual configuration.

**Important:**

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` are used by the PostgreSQL connection pool.
- `DATABASE_URL` is used by Prisma 7.
- `REDIS_URL` specifies the Redis connection.
- `JWT_SECRET` is used to sign and verify access tokens.
- Google OAuth credentials are required only when using Google authentication.
- Never commit your `.env` file or expose your credentials publicly.

The `.env` file is already included in `.gitignore`.

### 4. Set Up the Database

Create a PostgreSQL database named `Talent_Market` or update the environment variables to match your database name.

The database must contain the tables and relationships defined by the Prisma schema and expected by the SQL repositories.

The Prisma configuration is located in `prisma.config.ts`, while the database models are defined in:

```text
prisma/schema.prisma
```

Generate the Prisma Client:

```bash
npx prisma generate
```

The generated client is placed in:

```text
src/generated/prisma
```

This directory is ignored by Git, so generate the client after installing dependencies.

### 5. Start Redis

Make sure your Redis server is running and accessible using the configured `REDIS_URL`.

For a local Docker installation, you can use:

```bash
docker run -d \
  --name talentmarket-redis \
  -p 6379:6379 \
  redis:latest
```

Verify the Redis connection:

```bash
docker exec -it talentmarket-redis redis-cli ping
```

Expected response:

```text
PONG
```

### 6. Build the Application

Compile the TypeScript source code:

```bash
npm run build
```

The compiled JavaScript files are generated in the `dist` directory.

### 7. Start the Server

```bash
npm start
```

The application listens on:

```text
http://localhost:3000
```

The API base URL is:

```text
http://localhost:3000/api
```

---

## 📡 API Documentation

All endpoints are grouped according to their respective resources.

**Base URL:**

```text
http://localhost:3000/api
```

### 1. Authentication and User Management

Base route:

```text
/api/users
```

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/register` | Register a new user | Public |
| POST | `/login` | Authenticate with email and password | Public |
| GET | `/google` | Initiate Google OAuth | Public |
| GET | `/google/callback` | Handle Google OAuth callback | OAuth state validation |
| POST | `/refresh` | Rotate refresh token and obtain a new access token | Refresh cookie |
| POST | `/logout` | Revoke the current session | Authenticated |
| PUT | `/update` | Update user information | Authenticated |
| DELETE | `/:id` | Delete a user account | Admin |

#### Register a User

**POST** `/api/users/register`

Request body:

```json
{
  "name": "Victor Osimhen",
  "email": "victor@example.com",
  "password": "Password123!",
  "userType": "player"
}
```

Supported user types:

- `player`
- `scout`

#### Login

**POST** `/api/users/login`

Request body:

```json
{
  "email": "victor@example.com",
  "password": "Password123!"
}
```

A successful login returns user information and an access token, and sets an HTTP-only refresh-token cookie.

The current login response also includes the refresh token in its JSON payload. The cookie is the intended mechanism for subsequent refresh requests.

#### Google Authentication

**GET** `/api/users/google?user_type=player`

or

**GET** `/api/users/google?user_type=scout`

The endpoint initiates the Google OAuth flow and redirects the user to Google's authentication page.

After authentication, Google redirects to:

```text
/api/users/google/callback
```

#### Refresh Access Token

**POST** `/api/users/refresh`

No request body is required.

The endpoint reads the refresh token from the HTTP-only cookie, validates it, rotates it, and returns a new access token.

#### Logout

**POST** `/api/users/logout`

Requires:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

It also requires the refresh-token cookie.

#### Update User Information

**PUT** `/api/users/update`

Request body:

```json
{
  "name": "Victor James Osimhen",
  "email": "victor.osimhen@example.com"
}
```

#### Delete User

**DELETE** `/api/users/:id`

Requires an admin access token.

---

### 2. Player Management

Base route:

```text
/api/players
```

All player endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Retrieve all player profiles |
| POST | `/` | Create a player profile |
| GET | `/name?name=Victor` | Search players by name |
| GET | `/position?position=fwd` | Filter players by position |
| PUT | `/` | Update the authenticated user's player profile |
| DELETE | `/` | Delete a player profile |

#### Create Player Profile

**POST** `/api/players`

Requires an authenticated player or admin account.

Request body:

```json
{
  "position": "fwd",
  "ratings": 88,
  "contactDetails": "+2348012345678"
}
```

The player ID is obtained from the authenticated user's access token.

#### Retrieve All Players

**GET** `/api/players`

Returns player profiles ordered by ratings in descending order.

The response includes available user information such as name and email.

#### Search Players by Name

**GET** `/api/players/name?name=Victor`

Searches player accounts using the supplied name.

#### Filter Players by Position

**GET** `/api/players/position?position=fwd`

Supported values:

```text
gk
def
mid
fwd
```

#### Update Player Profile

**PUT** `/api/players`

Request body:

```json
{
  "ratings": 92,
  "contactDetails": "+2348099887766"
}
```

All profile fields are optional during updates.

The operation updates the authenticated user's profile.

#### Delete Player Profile

**DELETE** `/api/players`

A player can delete their own profile.

An admin can specify a target player using the `playerId` query parameter.

Example:

```text
DELETE /api/players?playerId=PLAYER_UUID
```

---

### 3. Scout Management

Base route:

```text
/api/scouts
```

All scout endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Retrieve all scout profiles |
| POST | `/` | Create a scout profile |
| GET | `/:scoutId` | Retrieve a scout by ID |
| PUT | `/:scoutId` | Update scout contact information |
| DELETE | `/:scoutId` | Delete a scout profile |

#### Create Scout Profile

**POST** `/api/scouts`

Requires an authenticated scout or admin account.

Request body:

```json
{
  "contactDetails": "+2348012345678"
}
```

The scout ID is obtained from the authenticated user's access token.

#### Retrieve All Scouts

**GET** `/api/scouts`

Returns scout profiles together with their associated user information.

#### Retrieve Scout by ID

**GET** `/api/scouts/:scoutId`

Example:

```text
GET /api/scouts/SCOUT_UUID
```

#### Update Scout Profile

**PUT** `/api/scouts/:scoutId`

Requires the scout themselves or an admin.

Request body:

```json
{
  "contactDetails": "+2348099887766"
}
```

#### Delete Scout Profile

**DELETE** `/api/scouts/:scoutId`

Accepts authenticated scout or admin roles.

---

### 4. Scout-Player Management

Base route:

```text
/api/scout-players
```

This module manages the relationship between scouts and players.

All endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/:playerId` | Add a player to a scout's list |
| GET | `/` | Retrieve players associated with the authenticated account |
| GET | `/:playerId/scouts` | Retrieve scouts associated with a player |
| DELETE | `/:playerId` | Remove a player from a scout's list |

#### Add a Player to a Scout's List

**POST** `/api/scout-players/:playerId`

The authenticated account must belong to a scout.

Example:

```text
POST /api/scout-players/PLAYER_UUID
```

The service verifies that:

- The authenticated user is a scout.
- The target user exists and is a player.
- The player has an existing player profile.
- The relationship does not already exist.

#### Retrieve Scouted Players

**GET** `/api/scout-players`

Returns player IDs associated with the authenticated account.

#### Retrieve Scouts Associated with a Player

**GET** `/api/scout-players/:playerId/scouts`

Returns the scouts associated with the specified player.

#### Remove a Player from a Scout's List

**DELETE** `/api/scout-players/:playerId`

Removes the specified player relationship from the authenticated scout's list.

---

## ⚠️ Error Handling

TalentMarket uses centralized error handling to maintain consistent API responses.

Custom application errors are implemented using the `AppError` class.

The global error handler is registered in `src/app.ts`.

### Common HTTP Status Codes

| Status | Description |
|---|---|
| 200 | Request completed successfully |
| 201 | Resource created successfully |
| 400 | Invalid request or validation failure |
| 401 | Authentication required or invalid credentials |
| 403 | Insufficient permissions |
| 404 | Requested resource not found |
| 409 | Resource conflict or duplicate entry |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

Example error response:

```json
{
  "message": "Invalid or expired refresh token"
}
```

Validation errors return descriptive messages indicating the fields that failed validation.

---

## ⚙️ Configuration

The application currently uses the following configuration:

| Configuration | Default |
|---|---|
| Server port | `3000` |
| Frontend CORS origin | `http://localhost:5173` |
| Access-token lifetime | 20 minutes |
| Refresh-token lifetime | 24 hours |
| Player cache lifetime | 3600 seconds |
| Login rate limit | 100 requests / 15 minutes |
| Registration rate limit | 50 requests / 30 minutes |

The frontend origin is configured in `src/config/security.ts`.

The server port is currently defined directly in `src/index.ts`.

---

## 🧪 Testing and API Development

During development, API endpoints can be tested using tools such as:

- [Postman](https://www.postman.com/)
- [Thunder Client](https://www.thunderclient.com/)

For protected endpoints, provide the access token through the Authorization header.

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

For refresh and logout operations, ensure your API client maintains the refresh-token cookie.

The current `package.json` does not yet define an automated test suite.

---

## 📌 Current Implementation Notes

- The API uses a layered architecture to separate HTTP handling, business logic, and database access.
- PostgreSQL is the primary database.
- Both parameterized SQL queries and Prisma 7 are used for database operations.
- Prisma is currently applied to scout-profile CRUD operations.
- Redis is used to cache the all-player listing.
- Cache invalidation is performed after successful player-profile mutations.
- Google OAuth supports both player and scout account types.
- Refresh tokens are hashed before being stored in the database.
- Refresh-token rotation uses PostgreSQL transactions.
- Authentication and authorization are enforced through middleware and service-level checks.

---

## 📜 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

**Ayomide Bello**

GitHub: [@ayomidebello604-a11y](https://github.com/ayomidebello604-a11y)

Project Repository: [TalentMarket-API](https://github.com/ayomidebello604-a11y/TalentMarket-API)