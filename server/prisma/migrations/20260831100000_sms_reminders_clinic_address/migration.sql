-- AlterTable
ALTER TABLE "Dentist" ADD COLUMN "clinicAddress" TEXT;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "reminderSent" BOOLEAN NOT NULL DEFAULT false;
