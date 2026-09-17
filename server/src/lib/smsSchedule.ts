import { SmsScheduleKind, SmsScheduleStatus } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import { getClinicContactInfo, resolveClinicPhone } from "./clinicSettings.js";
import { buildConfirmationMessage, buildReminderMessage } from "./sms.js";
import { formatPhDate, formatPhTime } from "./datetime.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type AppointmentForSms = {
  id: string;
  startAt: Date;
  patient: { firstName: string; lastName: string; phone: string | null };
  dentist: {
    displayName: string | null;
    phone: string | null;
    clinicAddress: string | null;
    user: { email: string };
  };
};

function formatAppointmentDateTime(startAt: Date): { date: string; time: string } {
  return {
    date: formatPhDate(startAt),
    time: formatPhTime(startAt),
  };
}

function messageParams(appt: AppointmentForSms, clinicPhone: string | null) {
  const { date, time } = formatAppointmentDateTime(appt.startAt);
  return {
    patientName: `${appt.patient.firstName} ${appt.patient.lastName}`.trim(),
    dentistName: appt.dentist.displayName ?? appt.dentist.user.email,
    date,
    time,
    clinicAddress: appt.dentist.clinicAddress?.trim() || config.clinicName,
    clinicPhone,
  };
}

/** Queue confirmation (send now) and a reminder 24h before the appointment. */
export async function scheduleAppointmentSms(appt: AppointmentForSms): Promise<void> {
  const phone = appt.patient.phone?.trim();
  if (!phone) {
    console.warn(`[sms] Skipping schedules for appointment ${appt.id}: patient has no phone`);
    return;
  }

  const contact = await getClinicContactInfo();
  const clinicPhone = resolveClinicPhone(contact, appt.dentist.phone);
  const params = messageParams(appt, clinicPhone);
  const now = new Date();
  const reminderAt = new Date(appt.startAt.getTime() - TWENTY_FOUR_HOURS_MS);

  const existing = await prisma.smsSchedule.findMany({
    where: { appointmentId: appt.id },
    select: { kind: true, status: true },
  });
  const alreadySent = new Set(
    existing.filter((row) => row.status === SmsScheduleStatus.SENT).map((row) => row.kind),
  );

  await prisma.smsSchedule.deleteMany({
    where: {
      appointmentId: appt.id,
      status: { not: SmsScheduleStatus.SENT },
    },
  });

  const rows: {
    appointmentId: string;
    kind: SmsScheduleKind;
    phone: string;
    message: string;
    scheduledAt: Date;
  }[] = [];

  if (!alreadySent.has(SmsScheduleKind.CONFIRMATION)) {
    rows.push({
      appointmentId: appt.id,
      kind: SmsScheduleKind.CONFIRMATION,
      phone,
      message: buildConfirmationMessage(params),
      scheduledAt: now,
    });
  }

  // Skip the day-before SMS when the appointment is already within 24 hours.
  if (!alreadySent.has(SmsScheduleKind.REMINDER) && reminderAt.getTime() > now.getTime() + 60_000) {
    rows.push({
      appointmentId: appt.id,
      kind: SmsScheduleKind.REMINDER,
      phone,
      message: buildReminderMessage(params),
      scheduledAt: reminderAt,
    });
  }

  if (rows.length === 0) return;

  await prisma.smsSchedule.createMany({ data: rows });
  console.log(
    `[sms] Queued ${rows.map((row) => row.kind).join(", ")} for appointment ${appt.id} (${phone})`,
  );
}

export async function cancelPendingSmsSchedules(appointmentId: string): Promise<void> {
  await prisma.smsSchedule.updateMany({
    where: {
      appointmentId,
      status: {
        in: [SmsScheduleStatus.PENDING, SmsScheduleStatus.CLAIMED, SmsScheduleStatus.FAILED],
      },
    },
    data: {
      status: SmsScheduleStatus.CANCELLED,
      claimedAt: null,
    },
  });
}

export async function listPendingSmsSchedules(opts?: { dueOnly?: boolean; limit?: number }) {
  const now = new Date();
  const limit = opts?.limit ?? 50;

  return prisma.smsSchedule.findMany({
    where: {
      status: SmsScheduleStatus.PENDING,
      ...(opts?.dueOnly ? { scheduledAt: { lte: now } } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: {
      id: true,
      appointmentId: true,
      kind: true,
      phone: true,
      message: true,
      scheduledAt: true,
    },
  });
}

export async function markSmsScheduleSent(id: string): Promise<boolean> {
  const result = await prisma.smsSchedule.updateMany({
    where: {
      id,
      status: { in: [SmsScheduleStatus.CLAIMED, SmsScheduleStatus.PENDING] },
    },
    data: {
      status: SmsScheduleStatus.SENT,
      sentAt: new Date(),
      claimedAt: null,
      error: null,
    },
  });
  return result.count > 0;
}

export async function markSmsScheduleFailed(id: string, error?: string): Promise<boolean> {
  const result = await prisma.smsSchedule.updateMany({
    where: {
      id,
      status: { in: [SmsScheduleStatus.CLAIMED, SmsScheduleStatus.PENDING] },
    },
    data: {
      status: SmsScheduleStatus.FAILED,
      claimedAt: null,
      error: error?.trim() || "Send failed",
    },
  });
  return result.count > 0;
}
