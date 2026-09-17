-- CreateEnum
CREATE TYPE "SmsScheduleKind" AS ENUM ('CONFIRMATION', 'REMINDER');

-- CreateEnum
CREATE TYPE "SmsScheduleStatus" AS ENUM ('PENDING', 'CLAIMED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SmsSchedule" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "SmsScheduleKind" NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "SmsScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsSchedule_status_scheduledAt_idx" ON "SmsSchedule"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SmsSchedule_appointmentId_kind_idx" ON "SmsSchedule"("appointmentId", "kind");

-- AddForeignKey
ALTER TABLE "SmsSchedule" ADD CONSTRAINT "SmsSchedule_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
