import { AppointmentStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { formatPhDateTime } from "./datetime.js";
import { cancelPendingSmsSchedules } from "./smsSchedule.js";

const MIN_INTERVAL_MS = 5_000;

let inflight: Promise<void> | null = null;
let lastFinished = 0;

type ExpirableAppointment = {
  id: string;
  startAt: Date;
  patientId: string;
  dentistId: string;
  patient: { firstName: string; lastName: string };
};

export async function notifyAppointmentExpired(appt: ExpirableAppointment): Promise<void> {
  const already = await prisma.notification.findFirst({
    where: { appointmentId: appt.id, title: "Appointment expired" },
    select: { id: true },
  });
  if (already) {
    await cancelPendingSmsSchedules(appt.id);
    return;
  }

  const when = formatPhDateTime(appt.startAt);
  const patientName = `${appt.patient.firstName} ${appt.patient.lastName}`.trim();

  await prisma.notification.create({
    data: {
      patientId: appt.patientId,
      appointmentId: appt.id,
      title: "Appointment expired",
      message: `Your appointment scheduled for ${when} was not confirmed and has expired.`,
    },
  });

  await prisma.dentistNotification.create({
    data: {
      dentistId: appt.dentistId,
      patientId: appt.patientId,
      title: "Appointment expired",
      message: `You have an unconfirmed pending appointment for ${patientName} on ${when} that has expired.`,
    },
  });

  await cancelPendingSmsSchedules(appt.id);
}

async function expireDueAppointments(): Promise<void> {
  const now = new Date();
  const due = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.PENDING,
      startAt: { lt: now },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  for (const appt of due) {
    const updated = await prisma.appointment.updateMany({
      where: { id: appt.id, status: AppointmentStatus.PENDING },
      data: { status: AppointmentStatus.EXPIRED },
    });
    if (updated.count === 0) continue;
    await notifyAppointmentExpired(appt);
  }
}

/** Mark pending appointments whose start time has passed as expired, and notify both sides. */
export function expireUnconfirmedAppointments(): Promise<void> {
  const now = Date.now();
  if (inflight) return inflight;
  if (now - lastFinished < MIN_INTERVAL_MS) return Promise.resolve();
  inflight = expireDueAppointments().finally(() => {
    inflight = null;
    lastFinished = Date.now();
  });
  return inflight;
}
