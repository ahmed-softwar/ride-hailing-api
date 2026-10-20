# Ride-Hailing API

A backend REST API for a ride-hailing service, built with Node.js, Express, MySQL, and Socket.IO. This portfolio project demonstrates authentication, role-based authorization, trip lifecycle management, driver status management, and real-time updates.

## Features

- User registration and login using JWT authentication and bcrypt password hashing
- Role-based access for riders, drivers, and administrators
- User profile management
- Trip creation, listing, and retrieval
- Trip lifecycle: `requested` -> `accepted` -> `in_progress` -> `completed`
- Trip cancellation with permission and status checks
- Driver status management during trip assignment and completion
- Driver location updates
- Real-time trip status and driver location events using Socket.IO
- Request validation and error handling
- Paginated trip listing

## Tech Stack

- Node.js
- Express.js
- MySQL
- mysql2
- JSON Web Tokens (JWT)
- bcrypt
- Socket.IO
- express-validator
- Helmet
- CORS

## Prerequisites

- Node.js and npm
- MySQL Server or XAMPP
- Git

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/ahmed-softwar/ride-hailing-api.git
cd ride-hailing-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the database

Create a MySQL database named `ride_hailing_db`.

Using phpMyAdmin:

1. Open phpMyAdmin.
2. Create a database named `ride_hailing_db`.
3. Select the database.
4. Open the **Import** tab.
5. Import `database/ride_hailing_db.sql`.

### 4. Configure environment variables

Create a local `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your local MySQL credentials and a strong, private `JWT_SECRET`.

Never commit `.env` or publish real credentials or JWT tokens.

### 5. Start the server

Development mode:

```bash
npm run dev
```

Regular mode:

```bash
npm start
```

The server uses the port configured in `.env`, which defaults to `3000`.

Check the health endpoint:

`GET http://localhost:3000/api/health`

A successful response confirms that the API is running and the database is connected.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Private secret used to sign and verify JWTs |

## API Endpoints

Protected REST endpoints require this header:

```http
Authorization: Bearer <JWT>
```

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server and database status |

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in and receive a JWT |

### Users

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users/me` | Get the current user's profile |
| PATCH | `/api/users/me` | Update the current user's profile |
| PATCH | `/api/users/me/password` | Change the current user's password |
| DELETE | `/api/users/me` | Delete the current user's account |
| GET | `/api/users` | List users (admin only) |
| GET | `/api/users/:id` | Get a user by ID (admin only) |
| PATCH | `/api/users/:id/status` | Update a user's status (admin only) |

### Drivers

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/drivers/location` | Update the authenticated driver's location |
| GET | `/api/drivers/:id/location` | Retrieve a driver's location, subject to authorization |

### Trips

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/trips` | Create a trip (rider) |
| GET | `/api/trips` | List trips available to the authenticated user |
| GET | `/api/trips/:id` | Get trip details, subject to authorization |
| PATCH | `/api/trips/:id/accept` | Accept a trip (driver) |
| PATCH | `/api/trips/:id/start` | Start an accepted trip (assigned driver) |
| PATCH | `/api/trips/:id/complete` | Complete a trip (assigned driver) |
| PATCH | `/api/trips/:id/cancel` | Cancel a trip when permitted |

Authorization depends on the user's role, trip ownership or assignment, and the trip's current status.

## Real-Time Updates with Socket.IO

Socket connections authenticate with a JWT using the handshake authentication object:

```javascript
io("http://localhost:3000", {
  auth: {
    token: "<JWT>"
  }
});
```

After connecting, a client can request to join a trip room by emitting `join_trip` with a trip ID, provided the user is authorized to access that trip.

The application supports these events:

- `trip_status_updated` - Notifies authorized trip-room participants of trip status changes.
- `driver_location_updated` - Shares driver location updates with relevant active trip rooms.

The included `test-socket.js` file can be used for local Socket.IO testing with a valid local test token and trip ID. Do not commit real tokens.

## Testing

Use Postman to exercise the REST endpoints with appropriate user roles and JWTs. Use the Socket.IO test script to explore real-time events.

## Project Scope

This is a portfolio and learning project focused on backend API development. It does not implement real payment processing or live map routing.
