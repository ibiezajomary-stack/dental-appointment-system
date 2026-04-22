CREATE TABLE "DentistDateBlock" (
  "id" TEXT NOT NULL,
  "dentistId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DentistDateBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DentistDateBlock_dentistId_startAt_idx" ON "DentistDateBlock"("dentistId", "startAt");
CREATE INDEX "DentistDateBlock_dentistId_endAt_idx" ON "DentistDateBlock"("dentistId", "endAt");

ALTER TABLE "DentistDateBlock"
  ADD CONSTRAINT "DentistDateBlock_dentistId_fkey"
  FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

