ALTER TABLE "StoredFile" ADD COLUMN "appointmentId" TEXT;

CREATE INDEX "StoredFile_appointmentId_idx" ON "StoredFile"("appointmentId");

ALTER TABLE "StoredFile"
  ADD CONSTRAINT "StoredFile_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

