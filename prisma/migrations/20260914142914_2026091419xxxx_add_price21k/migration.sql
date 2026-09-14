/*
  Add 21K gold price columns safely.
*/

-- Add price21k with a temporary default value
ALTER TABLE "GoldPrice"
ADD COLUMN "price21k" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "GoldPriceHistory"
ADD COLUMN "price21k" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Calculate 21K from existing 24K prices
UPDATE "GoldPrice"
SET "price21k" = "price24k" * 21.0 / 24.0;

UPDATE "GoldPriceHistory"
SET "price21k" = "price24k" * 21.0 / 24.0;

-- Remove the temporary defaults
ALTER TABLE "GoldPrice"
ALTER COLUMN "price21k" DROP DEFAULT;

ALTER TABLE "GoldPriceHistory"
ALTER COLUMN "price21k" DROP DEFAULT;