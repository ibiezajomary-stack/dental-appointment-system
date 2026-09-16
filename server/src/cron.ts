import { sendAppointmentReminders } from "./jobs/appointmentReminders.js";
import { prisma } from "./lib/prisma.js";

/**
 * Render Cron Job entrypoint. Runs appointment reminders once and exits.
 * Local: `npm run cron:dev -w server`
 * Production: `npm run cron`
 */
async function main(): Promise<void> {
  console.log("[reminders] Starting appointment reminder job");
  const result = await sendAppointmentReminders();
  console.log(
    `[reminders] Finished: checked=${result.checked} sent=${result.sent} skipped=${result.skipped} failed=${result.failed}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[reminders] Cron job failed:", err);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
