CREATE TABLE "PatientIdDocument" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "frontBlob" BYTEA,
  "frontMimeType" TEXT,
  "frontOriginalName" TEXT,
  "backBlob" BYTEA,
  "backMimeType" TEXT,
  "backOriginalName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PatientIdDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientIdDocument_patientId_key" ON "PatientIdDocument"("patientId");

ALTER TABLE "PatientIdDocument"
  ADD CONSTRAINT "PatientIdDocument_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

