-- Replace "available hours" with "unavailable blocks" (see DentistUnavailableBlock model).

DROP TABLE IF EXISTS "DentistWorkingHour";

CREATE TABLE "DentistUnavailableBlock" (
    "id" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,

    CONSTRAINT "DentistUnavailableBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DentistUnavailableBlock_dentistId_idx" ON "DentistUnavailableBlock"("dentistId");

ALTER TABLE "DentistUnavailableBlock" ADD CONSTRAINT "DentistUnavailableBlock_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
