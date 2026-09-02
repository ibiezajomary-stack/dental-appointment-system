import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { config } from "./lib/config.js";
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
import { publicSupportRouter } from "./routes/publicSupport.js";
import { sendAppointmentReminders } from "./jobs/appointmentReminders.js";

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
app.use("/api/public/support", publicSupportRouter);

function resolveClientDist(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "client/dist"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

const clientDist = resolveClientDist();
if (clientDist) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else if (config.nodeEnv === "production") {
  console.warn("[static] client/dist not found — only API routes are available");
}

app.use(errorHandler);

async function ensureUploadDir(): Promise<void> {
  await fsPromises.mkdir(path.resolve(config.uploadDir), { recursive: true });
}

/** Hourly: remind patients with confirmed appointments starting within 24 hours. */
cron.schedule("0 * * * *", () => {
  void sendAppointmentReminders().catch((err) => {
    console.error("[reminders] Cron job failed:", err);
  });
});

const start = async (): Promise<void> => {
  await ensureUploadDir();
  if (clientDist) {
    console.log(`[static] Serving client from ${clientDist}`);
  }
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
};

if (!process.env.VERCEL) {
  start().catch(console.error);
}
