import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { getClinicContactInfo, resolveClinicPhone } from "./clinicSettings.js";
import { buildConfirmationMessage, sendSms } from "./sms.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type AppointmentForSms = {
  id: string;
  startAt: Date;  patient: { firstName: string; lastName: string; phone: string | null };
  dentist: {
    displayName: string | null;
    phone: string | null;
    clinicAddress: string | null;
    user: { email: string };
  };
};

export function formatAppointmentDateTime(startAt: Date): { date: string; time: string } {
  return {
    date: startAt.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: startAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }),
  };
}

export async function sendAppointmentConfirmedSms(appt: AppointmentForSms): Promise<void> {
  const patientPhone = appt.patient.phone?.trim();
  if (!patientPhone) {
    console.warn("[sms] Skipping confirmation: patient has no phone on file");
    return;
  }

  const contact = await getClinicContactInfo();
  const clinicPhone = resolveClinicPhone(contact, appt.dentist.phone);

  const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`.trim();
  const dentistName = appt.dentist.displayName ?? appt.dentist.user.email;
  const { date, time } = formatAppointmentDateTime(appt.startAt);
  const clinicAddress = appt.dentist.clinicAddress?.trim() || config.clinicName;

  const message = buildConfirmationMessage({
    patientName,
    dentistName,
    date,
    time,
    clinicAddress,
    clinicPhone,
  });

  const result = await sendSms(patientPhone, message);
  if (result.ok) {
    console.log(`[sms] Sent confirmation SMS to patient ${patientPhone}`);
    const msUntil = appt.startAt.getTime() - Date.now();
    if (msUntil > 0 && msUntil <= TWENTY_FOUR_HOURS_MS) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });
    }
  } else {
    console.error(`[sms] Confirmation SMS to patient ${patientPhone} failed: ${result.error}`);
  }
}