CREATE TABLE "FixedCostAmountRevision" (
    "id" TEXT NOT NULL,
    "fixedCostId" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedCostAmountRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FixedCostAmountRevision_fixedCostId_effectiveAt_key"
ON "FixedCostAmountRevision"("fixedCostId", "effectiveAt");

CREATE INDEX "FixedCostAmountRevision_fixedCostId_effectiveAt_idx"
ON "FixedCostAmountRevision"("fixedCostId", "effectiveAt");

ALTER TABLE "FixedCostAmountRevision"
ADD CONSTRAINT "FixedCostAmountRevision_fixedCostId_fkey"
FOREIGN KEY ("fixedCostId") REFERENCES "FixedCost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
