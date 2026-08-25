import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { config } from "./lib/config.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { dentistsRouter } from "./routes/dentists.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { patientsRouter } from "./routes/patients.js";
import { consultationsRouter } from "./routes/consultations.js";
import { toothRecordsRouter } from "./routes/toothRecords.js";
import { filesRouter } from "./routes/files.js";
import { billingRouter } from "./routes/billing.js";
import { adminClinicRouter } from "./routes/adminClinic.js";
import { paymentsRouter } from "./routes/payments.js";
import { publicPaymentMethodsRouter } from "./routes/publicPaymentMethods.js";
import { notificationsRouter } from "./routes/notifications.js";
import { dentistNotificationsRouter } from "./routes/dentistNotifications.js";
import { adminNotificationsRouter } from "./routes/adminNotifications.js";
import { printRouter } from "./routes/print.js";
import { isSmsConfigured, sendSms } from "./lib/sms.js";

const app = express();

export default app;

const allowedOrigins = (config.clientOrigin ?? "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser clients or same-origin requests with no Origin header.
      if (!origin) return cb(null, true);

      // In development, allow all origins so you can access from phone on same Wi‑Fi.
      if (config.nodeEnv === "development") return cb(null, true);

      // In non-dev, require explicit allow-list (comma-separated in CLIENT_ORIGIN).
      if (allowedOrigins.includes(origin.replace(/\/$/, ""))) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dental-api" });
});

app.get("/api/internal/send-appointment-reminders", async (req, res, next) => {
  if (!config.cronSecret || req.header("authorization") !== `Bearer ${config.cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await sendAppointmentReminders();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRouter);
app.use("/api/dentists", dentistsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/consultations", consultationsRouter);
app.use("/api", toothRecordsRouter);
app.use("/api/files", filesRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", adminClinicRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/public-payment-methods", publicPaymentMethodsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/dentist-notifications", dentistNotificationsRouter);
app.use("/api/admin-notifications", adminNotificationsRouter);
app.use("/api/print", printRouter);

app.use(errorHandler);

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(path.resolve(config.uploadDir), { recursive: true });
}

async function sendAppointmentReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };
  if (!isSmsConfigured()) return result;

  const now = Date.now();
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: {
        gte: new Date(now + 23 * 60 * 60 * 1000),
        lte: new Date(now + 25 * 60 * 60 * 1000),
      },
    },
    include: { patient: true },
  });

  for (const appointment of appointments) {
    if (!appointment.patient.phone) {
      result.skipped += 1;
      continue;
    }

    const alreadySent = await prisma.notification.findFirst({
      where: { appointmentId: appointment.id, title: "Appointment reminder SMS sent" },
    });
    if (alreadySent) {
      result.skipped += 1;
      continue;
    }

    const when = appointment.startAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const message = `Reminder: you have a dental appointment tomorrow on ${when}.`;

    try {
      await sendSms(appointment.patient.phone, message);
      await prisma.notification.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          title: "Appointment reminder SMS sent",
          message,
        },
      });
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[sms-reminder] Failed for appointment ${appointment.id}:`, error);
    }
  }
  return result;
}

/** Hourly: retain the local-process scheduler for traditional Node hosting. */
cron.schedule("0 * * * *", async () => {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const count = await prisma.appointment.count({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lte: soon, gte: new Date() },
    },
  });
  if (count > 0 && config.nodeEnv === "development") {
    console.log(`[reminders] ${count} appointment(s) in the next 24h (email not configured)`);
  }
});

cron.schedule("0 * * * *", async () => {
  await sendAppointmentReminders();
});

const start = async (): Promise<void> => {
  await ensureUploadDir();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
};

if (!process.env.VERCEL) {
  start().catch(console.error);
}
