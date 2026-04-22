CREATE TABLE "DentistNotification" (
  "id" TEXT NOT NULL,
  "dentistId" TEXT NOT NULL,
  "patientId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DentistNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DentistNotification_dentistId_createdAt_idx" ON "DentistNotification"("dentistId", "createdAt");
CREATE INDEX "DentistNotification_patientId_idx" ON "DentistNotification"("patientId");

ALTER TABLE "DentistNotification"
  ADD CONSTRAINT "DentistNotification_dentistId_fkey"
  FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DentistNotification"
  ADD CONSTRAINT "DentistNotification_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

