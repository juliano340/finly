-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'CUSTOM');
CREATE TYPE "IntervalUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS', 'YEARS');
CREATE TYPE "EndType" AS ENUM ('NONE', 'DATE', 'COUNT');

-- AlterTable: FixedCost
ALTER TABLE "FixedCost" ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FixedCost" ADD COLUMN "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "FixedCost" ADD COLUMN "customInterval" INTEGER;
ALTER TABLE "FixedCost" ADD COLUMN "customUnit" "IntervalUnit";
ALTER TABLE "FixedCost" ADD COLUMN "endType" "EndType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "FixedCost" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "FixedCost" ADD COLUMN "endAfterCount" INTEGER;

-- AlterTable: FixedCostOccurrence
ALTER TABLE "FixedCostOccurrence" ADD COLUMN "dueDate" TIMESTAMP(3);

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
WHERE "FixedCostOccurrence"."fixedCostId" = fc.id;

-- Drop old unique constraint
ALTER TABLE "FixedCostOccurrence" DROP CONSTRAINT "FixedCostOccurrence_fixedCostId_month_userId_key";

-- Create new indexes
CREATE INDEX "FixedCostOccurrence_fixedCostId_dueDate_idx" ON "FixedCostOccurrence"("fixedCostId", "dueDate");
CREATE INDEX "FixedCostOccurrence_fixedCostId_month_idx" ON "FixedCostOccurrence"("fixedCostId", "month");
