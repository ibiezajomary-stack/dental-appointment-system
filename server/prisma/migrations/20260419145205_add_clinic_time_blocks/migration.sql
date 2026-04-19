-- CreateTable
CREATE TABLE "ClinicTimeBlock" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ClinicTimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicTimeBlock_startAt_idx" ON "ClinicTimeBlock"("startAt");

-- CreateIndex
CREATE INDEX "ClinicTimeBlock_endAt_idx" ON "ClinicTimeBlock"("endAt");

-- AddForeignKey
ALTER TABLE "ClinicTimeBlock" ADD CONSTRAINT "ClinicTimeBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
