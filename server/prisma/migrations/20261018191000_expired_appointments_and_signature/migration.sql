-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'EXPIRED';

-- CreateTable
CREATE TABLE "DentistSignature" (
    "id" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DentistSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DentistSignature_dentistId_key" ON "DentistSignature"("dentistId");

-- AddForeignKey
ALTER TABLE "DentistSignature" ADD CONSTRAINT "DentistSignature_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
