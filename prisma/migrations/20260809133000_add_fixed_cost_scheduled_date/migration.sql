ALTER TABLE "FixedCostOccurrence"
ADD COLUMN "scheduledDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "FixedCostOccurrence_fixedCostId_scheduledDate_key"
ON "FixedCostOccurrence"("fixedCostId", "scheduledDate");
