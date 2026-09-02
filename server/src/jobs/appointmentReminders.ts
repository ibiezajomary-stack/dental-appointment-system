import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
import { getClinicContactInfo } from "../lib/clinicSettings.js";
import { buildReminderMessage, sendSms } from "../lib/sms.js";

export async function sendAppointmentReminders(): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  const [appointments, contact] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSent: false,
        startAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
        dentist: {
          select: {
            displayName: true,
            clinicAddress: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    getClinicContactInfo(),
  ]);

  if (appointments.length === 0) return;

  const clinicPhone = contact.clinicPhone ?? contact.supportPhone;
  if (!clinicPhone) {
    console.warn("[reminders] Skipping: clinic contact phone not configured in database");
    return;
  }

  for (const appt of appointments) {
    const phone = appt.patient.phone?.trim();
    if (!phone) {
      console.warn(`[reminders] Skipping appointment ${appt.id}: patient has no phone`);
      continue;
    }

    const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`.trim();
    const dentistName = appt.dentist.displayName ?? appt.dentist.user.email;
    const startLocal = appt.startAt;
    const date = startLocal.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time = startLocal.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
    const clinicAddress = appt.dentist.clinicAddress?.trim() || config.clinicName;

    const message = buildReminderMessage({
      patientName,
      dentistName,
      date,
      time,
      clinicAddress,
      clinicPhone,
    });

    const result = await sendSms(phone, message);
    if (result.ok) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });
      console.log(`[reminders] Sent reminder for appointment ${appt.id} to ${phone}`);
    } else {
      console.error(`[reminders] Failed for appointment ${appt.id}: ${result.error}`);
    }
  }
}
