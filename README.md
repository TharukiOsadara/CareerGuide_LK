# CareerGuide_LK

Career Guide Support Application - A React Native mobile app with Node.js/Express backend and Neon PostgreSQL database.

## Project Structure

```
├── backend/                     <-- Express.js + Neon DB Service
│   ├── src/
│   │   ├── config/              <-- DB connection, environment variables
│   │   │   └── db.js
│   │   ├── controllers/         <-- Business logic (Functions for routes)
│   │   │   └── userController.js
│   │   ├── routes/              <-- API Endpoint routes
│   │   │   └── userRoutes.js
│   │   ├── middlewares/         <-- Auth check, Error handling middlewares
│   │   │   └── authMiddleware.js
│   │   └── utils/               <-- Helper functions
│   ├── .env                     <-- DB Credentials / Secrets (Git වලට යවන්න එපා)
│   ├── .gitignore
│   ├── init-db.sql              <-- Database initialization script
│   ├── package.json
│   └── server.js                <-- Entry point of Backend
│
├── frontend/                    <-- React Native (Expo Go App)
│   ├── assets/                  <-- Images, Fonts, Icons
│   ├── src/
│   │   ├── api/                 <-- Axios/Fetch calls to Backend
│   │   │   └── client.js
│   │   ├── components/          <-- Reusable UI Components (Buttons, Cards, etc.)
│   │   ├── navigation/          <-- React Navigation Stack / Tabs
│   │   ├── screens/             <-- App Screens (Home, Login, Profile, etc.)
│   │   ├── context/             <-- Global state (Auth state, Theme, etc.)
│   │   │   └── AuthContext.js
│   │   └── utils/               <-- Constants, helper functions
│   ├── App.js                   <-- Entry point of Expo App
│   ├── app.json                 <-- Expo configuration
│   ├── .gitignore
│   └── package.json
```

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Neon PostgreSQL (Serverless Postgres)
- **Frontend**: React Native with Expo
- **Authentication**: JWT (JSON Web Tokens)
- **API**: RESTful API

## Setup Instructions

### Prerequisites

- Node.js installed
- npm or yarn package manager
- Expo Go app on your mobile device (for testing)
- Neon DB account

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - The `.env` file is already configured with your Neon DB URL
   - Make sure to change `JWT_SECRET` in production

4. Initialize the database:
   - Run the SQL script in `init-db.sql` in your Neon DB dashboard
   - This creates the `users` table with required fields

5. Start the backend server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Scan the QR code with Expo Go app on your mobile device
   - Or press `a` to run on Android emulator
   - Or press `i` to run on iOS simulator

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
  - Body: `{ name, email, password }`

- `POST /api/users/login` - Login user
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

### Protected Routes (Requires JWT Token)

- `GET /api/users/profile` - Get user profile
  - Headers: `Authorization: Bearer <token>`

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://neondb_owner:npg_6U2aTnPXfolh@ep-autumn-wildflower-b5sf3tr4-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
```

## Features

- User registration and login
- JWT-based authentication
- Protected routes
- User profile management
- Persistent authentication with AsyncStorage
- Responsive React Native UI

## Development Notes

- The backend CORS is enabled for development
- Passwords are hashed using bcryptjs
- JWT tokens expire in 1 hour
- The frontend API client automatically includes the token in requests

## Troubleshooting

### Backend Issues

- If database connection fails, check your DATABASE_URL in `.env`
- Ensure Neon DB is accessible and the SQL script has been run

### Frontend Issues

- Make sure the backend is running before starting the frontend
- Check that the API_BASE_URL in `frontend/src/api/client.js` matches your backend URL
- For mobile testing, ensure your device and computer are on the same network

## License

ISC
