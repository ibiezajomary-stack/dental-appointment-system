-- Dentist payment methods (e.g., GCash QR) and appointment payment proofs.

CREATE TYPE "PaymentProvider" AS ENUM ('GCASH');

CREATE TYPE "PaymentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "DentistPaymentMethod" (
  "id" TEXT NOT NULL,
  "dentistId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "qrStoragePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DentistPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DentistPaymentMethod_dentistId_provider_key" ON "DentistPaymentMethod"("dentistId", "provider");
CREATE INDEX "DentistPaymentMethod_dentistId_idx" ON "DentistPaymentMethod"("dentistId");

ALTER TABLE "DentistPaymentMethod"
  ADD CONSTRAINT "DentistPaymentMethod_dentistId_fkey"
  FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AppointmentPayment" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "dentistId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "PaymentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "proofStoragePath" TEXT NOT NULL,
  "proofMimeType" TEXT NOT NULL,
  "proofOriginalName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  CONSTRAINT "AppointmentPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentPayment_appointmentId_key" ON "AppointmentPayment"("appointmentId");
CREATE INDEX "AppointmentPayment_dentistId_createdAt_idx" ON "AppointmentPayment"("dentistId", "createdAt");
CREATE INDEX "AppointmentPayment_patientId_createdAt_idx" ON "AppointmentPayment"("patientId", "createdAt");

ALTER TABLE "AppointmentPayment"
  ADD CONSTRAINT "AppointmentPayment_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentPayment"
  ADD CONSTRAINT "AppointmentPayment_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentPayment"
  ADD CONSTRAINT "AppointmentPayment_dentistId_fkey"
  FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentPayment"
  ADD CONSTRAINT "AppointmentPayment_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

