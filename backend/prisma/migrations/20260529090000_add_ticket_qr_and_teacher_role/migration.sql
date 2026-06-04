DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEACHER';
  END IF;
END $$;

ALTER TABLE "redemptions" ADD COLUMN "ticket_qr_hash" TEXT;
ALTER TABLE "redemptions" ADD COLUMN "ticket_used_at" TIMESTAMP(3);

UPDATE "redemptions"
SET "ticket_qr_hash" = CONCAT('TICKET_', "ticket_number", '_', REPLACE("id", '-', ''))
WHERE "ticket_qr_hash" IS NULL;

ALTER TABLE "redemptions" ALTER COLUMN "ticket_qr_hash" SET NOT NULL;

CREATE UNIQUE INDEX "redemptions_ticket_qr_hash_key" ON "redemptions"("ticket_qr_hash");
