import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin:
    process.env.CLIENT_ORIGIN ??
    process.env.RENDER_EXTERNAL_URL ??
    "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  clinicName: process.env.CLINIC_NAME ?? "RHU Calinog",
  supportHours:
    process.env.SUPPORT_HOURS ??
    "Monday–Friday, 8:00 AM – 5:00 PM. For urgent registration or login issues, call during office hours.",
  cronSecret: process.env.CRON_SECRET ?? "",
  sms: {
    enabled: Boolean(process.env.SMS_PROVIDER),
    provider: (process.env.SMS_PROVIDER ?? "twilio") as "twilio" | "semaphore",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
      authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
      fromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
    },
    semaphore: {
      apiKey: process.env.SEMAPHORE_API_KEY ?? "",
      senderName: process.env.SEMAPHORE_SENDER_NAME ?? "DENTAL",
    },
  },
};
