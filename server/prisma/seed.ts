import { PrismaClient, Role, AppointmentStatus, ConsultationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("Demo12345!", 12);

  await prisma.user.upsert({
    where: { email: "admin@dental.local" },
    update: {},
    create: {
      email: "admin@dental.local",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "dentist@dental.local" },
    update: {},
    create: {
      email: "dentist@dental.local",
      passwordHash,
      role: Role.DENTIST,
      dentist: {
        create: {
          licenseNumber: "DDS-DEMO-001",
          specialty: "General",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "patient@dental.local" },
    update: {},
    create: {
      email: "patient@dental.local",
      passwordHash,
      role: Role.PATIENT,
      patient: {
        create: {
          firstName: "Jamie",
          lastName: "Doe",
          phone: "+10000000000",
          medicalHistory: "None reported",
          allergies: "None",
        },
      },
    },
  });

  const dentist = await prisma.dentist.findFirstOrThrow({
    where: { user: { email: "dentist@dental.local" } },
  });
  const patient = await prisma.patient.findFirstOrThrow({
    where: { user: { email: "patient@dental.local" } },
  });

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(14, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  await prisma.appointment.upsert({
    where: { id: "seed-appointment-1" },
    update: {},
    create: {
      id: "seed-appointment-1",
      patientId: patient.id,
      dentistId: dentist.id,
      startAt: start,
      endAt: end,
      status: AppointmentStatus.CONFIRMED,
      notes: "Demo appointment from seed",
    },
  });

  await prisma.consultation.upsert({
    where: { id: "seed-consultation-1" },
    update: {},
    create: {
      id: "seed-consultation-1",
      patientId: patient.id,
      dentistId: dentist.id,
      status: ConsultationStatus.SCHEDULED,
      videoRoomId: "dental-seed-room",
    },
  });

  console.log("Seed OK: admin@dental.local, dentist@dental.local, patient@dental.local (password: Demo12345!)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
