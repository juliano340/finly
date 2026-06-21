-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "IntervalUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS', 'YEARS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "EndType" AS ENUM ('NONE', 'DATE', 'COUNT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable: FixedCost
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "customInterval" INTEGER;
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "customUnit" "IntervalUnit";
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "endType" "EndType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "FixedCost" ADD COLUMN IF NOT EXISTS "endAfterCount" INTEGER;

-- AlterTable: FixedCostOccurrence
ALTER TABLE "FixedCostOccurrence" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

-- Backfill dueDate for existing monthly occurrences
UPDATE "FixedCostOccurrence" SET "dueDate" = 
  CASE 
    WHEN fc."dueDay" IS NOT NULL THEN 
      MAKE_TIMESTAMP(
        CAST(SUBSTRING("FixedCostOccurrence"."month" FROM 1 FOR 4) AS INTEGER),
        CAST(SUBSTRING("FixedCostOccurrence"."month" FROM 6 FOR 2) AS INTEGER),
        LEAST(fc."dueDay", DATE_PART('day', 
          (CAST(SUBSTRING("FixedCostOccurrence"."month" FROM 1 FOR 4) || '-' || SUBSTRING("FixedCostOccurrence"."month" FROM 6 FOR 2) || '-01' AS DATE) + INTERVAL '1 month' - INTERVAL '1 day'
          ))
        ),
        12, 0, 0
      )
    ELSE 
      CAST(SUBSTRING("FixedCostOccurrence"."month" FROM 1 FOR 4) || '-' || SUBSTRING("FixedCostOccurrence"."month" FROM 6 FOR 2) || '-01' AS TIMESTAMP)
  END
FROM "FixedCost" fc
WHERE "FixedCostOccurrence"."fixedCostId" = fc.id
  AND "FixedCostOccurrence"."dueDate" IS NULL;

-- Drop old unique constraint
ALTER TABLE "FixedCostOccurrence" DROP CONSTRAINT IF EXISTS "FixedCostOccurrence_fixedCostId_month_userId_key";

-- Create new indexes
CREATE INDEX IF NOT EXISTS "FixedCostOccurrence_fixedCostId_dueDate_idx" ON "FixedCostOccurrence"("fixedCostId", "dueDate");
CREATE INDEX IF NOT EXISTS "FixedCostOccurrence_fixedCostId_month_idx" ON "FixedCostOccurrence"("fixedCostId", "month");
