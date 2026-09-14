-- CreateTable
CREATE TABLE "ClinicSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "clinicPhone" TEXT,
    "supportPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);

-- Singleton row for clinic contact numbers
INSERT INTO "ClinicSettings" ("id", "clinicPhone", "supportPhone", "updatedAt")
VALUES ('default', NULL, NULL, CURRENT_TIMESTAMP);
