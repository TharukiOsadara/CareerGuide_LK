# CareerGuide LK

Role-based career-guidance mobile app for Sri Lankan A/L students.
**Frontend:** Expo / React Native. **Backend:** Express + PostgreSQL (Neon). **Auth:** JWT + Google OAuth.

## Roles
- **Student / Parent / Counsellor** — sign up & sign in from the standard auth screens.
- **Admin** — signs in through the Admin Portal; new admins stay *pending* until a **super admin** approves them.

Each account can only sign in from its own role tab (role-based access is enforced server-side).

## 1. Configure environment
Edit `.env` in the project root:
- `DATABASE_URL` — Neon connection string (already set).
- `JWT_SECRET` — change for production.
- `GOOGLE_CLIENT_ID` — your Google OAuth **Web** client ID (needed for Google sign-in).
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — the primary admin seeded on DB init.

## 2. Backend
```bash
cd backend
npm install
node src/initDb.js     # creates tables + seeds super admin, demo users, sample courses
npm run dev            # starts the API on http://localhost:5000
```

### Seeded accounts (demo)
| Role       | Email                        | Password   |
|------------|------------------------------|------------|
| Admin (super) | admin@careerguide.lk      | Admin@1234 |
| Student    | tharuki@student.lk           | Test@1234  |
| Student    | savindi@gmail.com            | Test@1234  |
| Parent     | parent@careerguide.lk        | Test@1234  |
| Counsellor | counsellor@careerguide.lk    | Test@1234  |

## 3. Frontend
```bash
cd frontend
npm install
npm start              # Expo dev server (press w for web, a for Android, i for iOS)
```

**Point the app at the backend** in `frontend/src/config.js`:
- Web / iOS simulator: `http://localhost:5000` (default).
- Android emulator: `http://10.0.2.2:5000` (default).
- Physical phone (Expo Go): set `LAN_IP` / `EXPO_PUBLIC_API_URL` to your PC's LAN IP, e.g. `http://192.168.1.5:5000`.

## App flow
Splash → Onboarding → (Learn More → About) / (Get Started → Privacy Consent → Sign Up) → Sign In
→ Student Dashboard (Home / Quiz / Courses / Profile + Notifications)
or Admin Portal → Admin Dashboard (Overview / Courses / Z-Scores / Audit Logs / Settings + Profile / Notifications).

## API surface
`/api/auth` (signup, signin, google, role-lookup, forgot/reset-password, admin/register, me, logout) ·
`/api/courses` (CRUD, admin write) · `/api/notifications` (feed + admin CRUD) ·
`/api/users` (admin: list, lock/block/unlock/unblock, admin-request approval) ·
`/api/logs` (sessions, audit timeline, stats) · `/api/settings` (admin toggles).
