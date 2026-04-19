-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "address" TEXT,
ADD COLUMN     "physicianAddress" TEXT,
ADD COLUMN     "physicianName" TEXT,
ADD COLUMN     "physicianPhone" TEXT,
ADD COLUMN     "referredBy" TEXT;

-- CreateTable
CREATE TABLE "PatientDentalReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "presentOralComplaint" TEXT,
    "familyHistory" TEXT,
    "remarks" TEXT,
    "medicalHistory" JSONB,
    "clinicalExamination" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PatientDentalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientDentalReport_patientId_key" ON "PatientDentalReport"("patientId");

-- AddForeignKey
ALTER TABLE "PatientDentalReport" ADD CONSTRAINT "PatientDentalReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
