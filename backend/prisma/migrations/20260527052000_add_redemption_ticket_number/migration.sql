CREATE SEQUENCE IF NOT EXISTS redemption_ticket_number_seq START WITH 100050 INCREMENT BY 1;

ALTER TABLE "redemptions" ADD COLUMN "ticket_number" INTEGER;

WITH numbered_redemptions AS (
  SELECT
    "id",
    100049 + ROW_NUMBER() OVER (ORDER BY "redeemed_at", "id") AS "ticket_number"
  FROM "redemptions"
  WHERE "ticket_number" IS NULL
)
UPDATE "redemptions" AS r
SET "ticket_number" = n."ticket_number"
FROM numbered_redemptions AS n
WHERE r."id" = n."id";

SELECT setval(
  'redemption_ticket_number_seq',
  COALESCE((SELECT MAX("ticket_number") FROM "redemptions"), 100049),
  true
);

ALTER TABLE "redemptions"
  ALTER COLUMN "ticket_number" SET DEFAULT nextval('redemption_ticket_number_seq'),
  ALTER COLUMN "ticket_number" SET NOT NULL;

CREATE UNIQUE INDEX "redemptions_ticket_number_key" ON "redemptions"("ticket_number");
