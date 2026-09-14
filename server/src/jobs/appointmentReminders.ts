import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
import { getClinicContactInfo, resolveClinicPhone } from "../lib/clinicSettings.js";
import { formatAppointmentDateTime } from "../lib/appointmentSms.js";
import { buildReminderMessage, sendSms } from "../lib/sms.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function sendAppointmentReminders(): Promise<{
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const now = new Date();
  const within24Hours = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

  const [appointments, contact] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSent: false,
        startAt: { gt: now, lte: within24Hours },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
        dentist: {
          select: {
            displayName: true,
            phone: true,
            clinicAddress: true,
            user: { select: { email: true } },
          },
        },
      },
    }),
    getClinicContactInfo(),
  ]);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const appt of appointments) {
    const patientPhone = appt.patient.phone?.trim();
    if (!patientPhone) {
      console.warn(`[reminders] Skipping appointment ${appt.id}: patient has no phone`);
      skipped += 1;
      continue;
    }

    const clinicPhone = resolveClinicPhone(contact, appt.dentist.phone);
    const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`.trim();
    const dentistName = appt.dentist.displayName ?? appt.dentist.user.email;
    const { date, time } = formatAppointmentDateTime(appt.startAt);
    const clinicAddress = appt.dentist.clinicAddress?.trim() || config.clinicName;

    const message = buildReminderMessage({
      patientName,
      dentistName,
      date,
      time,
      clinicAddress,
      clinicPhone,
    });

    const result = await sendSms(patientPhone, message);
    if (result.ok) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });
      sent += 1;
      console.log(`[reminders] Sent reminder to patient ${patientPhone} for appointment ${appt.id}`);
    } else {
      failed += 1;
      console.error(`[reminders] Failed for appointment ${appt.id}: ${result.error}`);
    }
  }

  return { checked: appointments.length, sent, skipped, failed };
}
