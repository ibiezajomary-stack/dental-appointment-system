# Implementation Plan: Web-Based Dental Appointment and Patient Care System

This document turns the agreed system design into an actionable build order, milestones, and technical decisions. It is written for a thesis-grade project where **stability, clear documentation, and demonstrable features** matter as much as code quality.

---

## 1. Goals and Scope

| Objective | Module | In scope for implementation |
|-----------|--------|------------------------------|
| **S.O. 1** — Streamline scheduling | Appointment Engine | Calendar, availability, booking/cancellation, conflict detection, reminders (email first; SMS as stretch) |
| **S.O. 2** — Records management | Patient EHR | Demographics, history, allergies, treatment history, billing linkage, secure file uploads (e.g. X-rays) |
| **S.O. 3** — Online consultation | Tele-Dental Portal | **Live video consultation** (video calling / video meeting): patient and dentist join the same session in the browser; plus request/approval workflow; optional async chat and photo upload |

**Out of scope (unless time permits):** Full HL7/FHIR integration, insurance claim automation, native mobile apps.

---

## 2. Technology Stack

**Locked decisions:** **React** for the frontend (with React Router and a component library). **Node.js** with **Express** for the backend API. **PostgreSQL** on **Aiven** for the database. The design originally allowed other stacks; this project standardizes on **JavaScript/TypeScript end-to-end** (React + Express) with PostgreSQL.

For a **single coherent codebase, strong docs, and one language across client and server**, the stack is:

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Frontend (View)** | **React** + a component library (e.g. MUI or Chakra) + **React Router** | Large ecosystem, responsive layouts, easy thesis appendices (screenshots, component tree) |
| **Backend (Controller)** | **Node.js** + **Express** (HTTP API, middleware, routing) | Same runtime and language family as the React app; JWT and file-upload patterns are well documented |
| **Database (Model)** | **PostgreSQL** (hosted on **Aiven**) | Strong relational fit for patients, appointments, and audit-friendly records; JSON columns optional for flexible chart metadata; managed service via [Aiven console](https://console.aiven.io) |
| **ORM / migrations** | Prisma or Knex + migrations | Reproducible schema for thesis “database design” chapter |
| **Auth** | **JWT** (access + optional refresh), **bcrypt** for passwords | Matches design; stateless API suits SPA |
| **Real-time / video** | **Jitsi Meet** embed (iframe/API), **Daily.co**, or **Zoom Meeting SDK** — any option that delivers a **real-time video call** in the app; under the hood this is typically **WebRTC** | Satisfies mandatory online consultation via video meeting; document the chosen integration in the thesis |
| **File storage** | Local disk (dev) → S3-compatible or secured folder (prod thesis demo) | X-rays/uploads with size/type checks |

### Database hosting: Aiven

- **Provisioning:** Create and manage the PostgreSQL service in **[Aiven console](https://console.aiven.io)** (service tier suitable for development/thesis demo; scale if needed).
- **Connection:** Use the **Service URI** (or host, port, database name, user, password) from the Aiven dashboard. Point the backend’s `DATABASE_URL` (or equivalent) at this instance.
- **TLS:** Aiven PostgreSQL typically requires **SSL**; enable SSL in the connection string or ORM config and use the **CA certificate** from the Aiven connection details if your client requires it.
- **Secrets:** Keep credentials in environment variables (e.g. `.env` locally); do **not** commit them to git. For team/thesis demos, use a shared secret channel or deployment env vars.
- **Migrations:** Run Prisma/Knex migrations against the Aiven database from your machine or CI once credentials are configured.

---

## 3. System Architecture (MVC Mapping)

```
┌─────────────────────────────────────────────────────────────┐
│  View (React): pages, forms, tooth chart, calendar, video consult UI │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JSON / JWT
┌──────────────────────────▼──────────────────────────────────┐
│  Controller (Node.js + Express): routes, validation, auth middleware   │
│  Services: appointments, EHR, consultations, notifications   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Model (PostgreSQL + ORM): entities, transactions, audit     │
└─────────────────────────────────────────────────────────────┘
```

**Principles:**

- **Thin controllers**: HTTP in/out only; business rules in service layer.
- **Role-based access control (RBAC)**: Admin, Dentist, Patient — enforced on every protected route and reflected in UI navigation.
- **Audit trail** (recommended for thesis): who changed critical health/financial fields and when.

---

## 4. Functional Modules — Implementation Breakdown

### 4.1 Appointment Engine (S.O. 1)

| Feature | Implementation notes |
|---------|------------------------|
| Real-time calendar | Server exposes “available slots” derived from dentist working hours minus existing appointments; client renders month/week/day views |
| Conflict detection | Unique constraint or transaction: `(dentist_id, start_at)`; double-check overlap in service layer before insert |
| Booking / cancellation | State machine: `pending` → `confirmed` → `completed` / `cancelled`; cancellation rules (e.g. cutoff time) as config |
| Reminders | Job queue or cron (e.g. node-cron): email 24h/1h before; SMS via Twilio later |

**Deliverables:** REST API for slots and appointments; patient booking flow; dentist/staff calendar; basic admin override.

### 4.2 Patient EHR Module (S.O. 2)

| Feature | Implementation notes |
|---------|------------------------|
| Master patient record | CRUD with strict role permissions (patients see own; staff see assigned or all per policy) |
| Medical history & allergies | Structured fields + optional free text |
| Treatment history | Linked to visits/appointments and procedures |
| Billing records | Minimal: invoice line items, status, link to appointment; full accounting optional |
| Secure file uploads | Virus scan optional; MIME/size limits; store metadata in DB; signed URLs if using object storage |
| Dental charts | See §7 — tooth-level rows or JSON keyed by FDI/Universal tooth id |

**Deliverables:** EHR screens for dentist; patient-facing read-only or summary where appropriate; upload/list/download with authorization checks.

### 4.3 Tele-Dental Portal (S.O. 3)

**Core requirement:** Online consultation **must** include a **live video session** — i.e. a **video call / video meeting** where dentist and patient see and hear each other (not chat-only). Chat and photo upload are supplements, not replacements for video.

| Feature | Implementation notes |
|---------|------------------------|
| **Video calling / video meeting** | Embed or launch a meeting room (e.g. Jitsi: unique room name per `consultation_id`; both roles use “Join” from the React app). Ensure both patient and dentist can connect camera/microphone; handle “waiting for host” if your provider supports it |
| Consultation request | Patient submits request; appears in dentist queue |
| Pre-consult review | Dentist opens EHR in same flow (addresses “specific problem 2”) |
| Session lifecycle | Store `video_room_id` / meeting URL reference; optional `started_at` / `ended_at` when the call begins and ends |
| Async chat / photos | Optional: thread per consultation + image upload (reuse file pipeline) |

**Deliverables:** End-to-end flow: request → approve/schedule → **join video meeting** (both parties) → post-consult notes saved to the same consultation record.

---

## 5. Database Design (ER-Driven)

Align tables with the design’s core entities. Suggested entities (names illustrative — adjust to ORM naming):

| Entity | Key fields / relationships |
|--------|----------------------------|
| **users** | `id`, email, password_hash, `role` (enum: admin, dentist, patient), `created_at` |
| **patients** | `user_id` (FK), demographics, emergency contact, `medical_history`, `allergies` |
| **dentists** | `user_id` (FK), license/specialty optional, `working_hours` (normalized table or JSON) |
| **appointments** | `patient_id`, `dentist_id`, `start_at`, `end_at`, `status`, optional `notes` |
| **consultations** | `appointment_id` or standalone, `status`, `video_room_id`, `started_at`, `ended_at` |
| **consultation_notes** | `consultation_id`, diagnosis, prescribed meds, free-text notes, `created_by` |
| **dental_records** / **tooth_records** | `patient_id`, tooth identifier (FDI), `condition`, `procedure`, `recorded_at`, `recorded_by` |
| **files** | `owner_type`, `owner_id`, storage path, mime, hash, uploaded_by |
| **billing** (minimal) | `patient_id`, `appointment_id`, amount, status, timestamps |

**Indexes:** `(dentist_id, start_at)` for calendar queries; FK indexes on all relations.

**Migrations:** Version every change; export ER diagram (dbdiagram.io or IDE) for the thesis document.

---

## 6. System Process Flows (Implementation Order)

1. **Registration / login** — Users + JWT; role-based redirect (dashboard vs patient portal).
2. **Booking** — Dentist defines availability → patient browses slots → appointment created with conflict checks.
3. **Virtual consultation (video)** — Request → dentist reviews EHR → scheduled consultation → **both join video call / video meeting** → notes persisted to **consultations** + **consultation_notes** + **dental_records** as needed.
4. **Follow-up** — Appointment status updates; treatment plan as structured note or linked plan table; history visible on patient timeline.

Automate where simple: status transitions after consultation completion; email reminders before appointments.

---

## 7. UI/UX Milestones

| Area | Target |
|------|--------|
| **Dentist dashboard** | “Today’s appointments” as default landing; quick actions (confirm, open chart) |
| **Responsive design** | Mobile-first booking; touch-friendly controls |
| **Visual tooth chart** | SVG or canvas grid of teeth; click tooth → modal for condition/procedure; persist to `tooth_records` |
| **Video consultation UI** | Clear “Join video consultation” for patient and dentist; embedded meeting or new tab per policy; loading/error if camera/mic blocked |
| **Accessibility** | Labels, focus order, sufficient contrast (thesis bonus: WCAG awareness) |

---

## 8. Security Checklist

- Passwords: **bcrypt** (or argon2) with sensible cost factor.
- Sessions/API: **JWT** with short expiry; HTTPS only in production.
- Authorization: **Every** EHR/file/consultation endpoint checks role + resource ownership.
- Input validation: server-side schemas (e.g. Zod/Joi).
- Files: no execution from upload dir; random filenames; content-type validation.
- Privacy: minimal PII in logs; thesis section on data handling consent if required by institution.

---

## 9. Phased Roadmap (Suggested Timeline)

| Phase | Duration (indicative) | Outcome |
|-------|------------------------|---------|
| **P0 — Foundation** | 1–2 weeks | Repo, DB, auth, roles, CI lint/test, deployment sketch |
| **P1 — Appointments** | 2–3 weeks | Availability, booking, calendar, conflict rules, email reminders |
| **P2 — EHR core** | 2–3 weeks | Patient records, history, uploads, dentist/patient views |
| **P3 — Tooth chart** | 1–2 weeks | Interactive chart + persistence |
| **P4 — Tele-dental** | 2 weeks | Consultation workflow + **live video meeting integration** (e.g. Jitsi embed) + post-consult notes |
| **P5 — Hardening** | 1–2 weeks | RBAC review, error handling, demo data, thesis screenshots |

Adjust phases to your submission date; **MVP for defense** = P0 + P1 + partial P2 (records without full billing). For a complete **S.O. 3** demo, include **P4** so evaluators can see a real **video consultation**, not only scheduling and records.

---

## 10. Testing and Documentation (Thesis Alignment)

- **Unit tests**: Services (appointment overlap, RBAC helpers).
- **Integration tests**: Auth + main API flows.
- **Manual test script**: Login as each role; book; start **video consultation** (two browsers or two users); confirm audio/video; complete consultation; verify history.
- **Documentation**: API outline (OpenAPI/Swagger optional), ER diagram, architecture diagram, user manual for demo.

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Scope creep (full billing, SMS, mobile app) | Lock MVP; list “future work” in thesis |
| Video integration complexity | Use Jitsi embed first; document WebRTC theory without custom SFU |
| Data privacy concerns | RBAC + audit fields; anonymized demo data for presentations |
| Schedule slip | Tooth chart and tele-dental are impressive but can be phased |

---

## 12. Definition of Done (Project)

- [ ] Three roles can authenticate and see role-appropriate UI.
- [ ] Patients can book/cancel within rules; dentists see calendar and conflicts are prevented.
- [ ] EHR supports history, allergies, and secure file upload with authorization.
- [ ] Tooth chart records conditions per tooth and displays on patient view.
- [ ] At least one complete **online consultation including a live video call / video meeting** (patient and dentist both join), with consultation notes stored in the database.
- [ ] Written documentation and diagrams suitable for thesis chapters.

---

*This plan should be updated when institutional requirements (e.g. ethics, data residency, Aiven region) or other constraints are finalized.*
