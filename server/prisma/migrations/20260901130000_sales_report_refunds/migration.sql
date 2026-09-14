-- AlterEnum (skip if already added by a prior migration)
DO $$ BEGIN
  ALTER TYPE "PaymentVerificationStatus" ADD VALUE 'REFUNDED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "AppointmentPayment" ADD COLUMN IF NOT EXISTS "refundGcashNumber" TEXT;

-- CreateTable
CREATE TABLE "SalesReport" (
    "id" TEXT NOT NULL,
    "dentistId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesReport_dentistId_paymentDate_idx" ON "SalesReport"("dentistId", "paymentDate");

-- AddForeignKey
ALTER TABLE "SalesReport" ADD CONSTRAINT "SalesReport_dentistId_fkey" FOREIGN KEY ("dentistId") REFERENCES "Dentist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
