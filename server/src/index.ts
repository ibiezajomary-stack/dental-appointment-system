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

const app = express();

const allowedOrigins = (config.clientOrigin ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser clients or same-origin requests with no Origin header.
      if (!origin) return cb(null, true);

      // In development, allow all origins so you can access from phone on same Wi‑Fi.
      if (config.nodeEnv === "development") return cb(null, true);

      // In non-dev, require explicit allow-list (comma-separated in CLIENT_ORIGIN).
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dental-api" });
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

app.use(errorHandler);

async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(path.resolve(config.uploadDir), { recursive: true });
}

/** Hourly: placeholder for email/SMS reminders (wire SMTP or provider later). */
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

const start = async (): Promise<void> => {
  await ensureUploadDir();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
};

start().catch(console.error);
