-- CreateEnum
CREATE TYPE "ToothSurfaceStateKind" AS ENUM ('NONE', 'CARIES', 'FILLED', 'CROWN', 'MISSING', 'WATCH');

-- CreateTable
CREATE TABLE "ToothSurfaceState" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "toothFdi" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "state" "ToothSurfaceStateKind" NOT NULL DEFAULT 'NONE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ToothSurfaceState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToothSurfaceState_patientId_idx" ON "ToothSurfaceState"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "ToothSurfaceState_patientId_toothFdi_surface_key" ON "ToothSurfaceState"("patientId", "toothFdi", "surface");

-- AddForeignKey
ALTER TABLE "ToothSurfaceState" ADD CONSTRAINT "ToothSurfaceState_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
