ALTER TABLE "redemptions" ADD COLUMN "ticket_validated_by_id" TEXT;

UPDATE "redemptions" AS r
SET "ticket_validated_by_id" = a."user_id"
FROM "audit_logs" AS a
WHERE a."action_type" = 'SCAN_REWARD_TICKET'
  AND a."status" = 'SUCCESS'
  AND a."user_id" IS NOT NULL
  AND a."details"->'body'->>'ticket_qr_hash' = r."ticket_qr_hash"
  AND r."ticket_validated_by_id" IS NULL;

CREATE INDEX "redemptions_ticket_used_at_idx" ON "redemptions"("ticket_used_at");
CREATE INDEX "redemptions_ticket_validated_by_id_idx" ON "redemptions"("ticket_validated_by_id");

ALTER TABLE "redemptions"
  ADD CONSTRAINT "redemptions_ticket_validated_by_id_fkey"
  FOREIGN KEY ("ticket_validated_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
