-- Store uploaded files as BLOBs in DB (Bytes/bytea). Keep legacy *StoragePath columns as nullable for fallback.

ALTER TABLE "StoredFile"
  ADD COLUMN "blob" BYTEA,
  ALTER COLUMN "storagePath" DROP NOT NULL;

ALTER TABLE "DentistPaymentMethod"
  ADD COLUMN "qrBlob" BYTEA,
  ALTER COLUMN "qrStoragePath" DROP NOT NULL;

ALTER TABLE "AppointmentPayment"
  ADD COLUMN "proofBlob" BYTEA,
  ALTER COLUMN "proofStoragePath" DROP NOT NULL;

