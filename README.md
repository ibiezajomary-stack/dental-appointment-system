# Dental Appointment & Patient Care System

Full-stack implementation aligned with `implementation.md`: **React** (Vite), **Express**, **PostgreSQL** (e.g. **Aiven**), **Prisma**, **JWT** + **bcrypt**, tele-dental via **Jitsi Meet** embed.

## Prerequisites

- Node.js 20+ (20.19+ recommended; Vite 5 works on 20.16)
- PostgreSQL (local or [Aiven](https://console.aiven.io))

## Setup

1. **Clone / open** this folder and install dependencies:

   ```bash
   npm install
   ```

2. **Database** — copy `server/.env.example` to `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string. For Aiven, use the **Service URI** and include SSL, e.g.:

   `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`

3. **Apply schema** (from repo root):

   ```bash
   cd server
   npx prisma migrate dev --name init
   npm run db:seed
   ```

   Seeded accounts (password `Demo12345!`):

   - `admin@dental.local` — ADMIN  
   - `dentist@dental.local` — DENTIST (Mon–Fri 09:00–17:00 working hours)  
   - `patient@dental.local` — PATIENT  

4. **JWT** — set `JWT_SECRET` in `server/.env` to a long random string.

5. **Run dev** (API + React with Vite proxy to `http://localhost:4000`):

   ```bash
   npm run dev
   ```

   - API: `http://localhost:4000/api/health`  
   - App: `http://localhost:5173`  

## Project layout

| Path | Purpose |
|------|---------|
| `client/` | React SPA (MUI, React Router) |
| `server/` | Express API, Prisma, uploads under `UPLOAD_DIR` |

## Features implemented

- Registration / login with roles (Patient, Dentist; Admin via seed)
- Appointment booking with slot generation from dentist working hours + overlap checks
- Patient EHR profile (PATCH `/api/patients/me`)
- Consultations with `videoRoomId` and **Jitsi** iframe (patient & dentist “Join video”)
- FDI tooth chart (patient view; dentist add records)
- File uploads (images/PDF) with RBAC
- Minimal billing records API
- Hourly cron placeholder for reminders (logs in development)

## Production notes

- Serve the SPA build (`client/dist`) behind HTTPS; set `CLIENT_ORIGIN` for CORS.
- Use strong `JWT_SECRET`, secure cookies if you move to cookie-based sessions later.
- Store uploads on durable storage (S3-compatible) for production.
