ALTER TABLE "FixedCostOccurrence"
ADD COLUMN "bankAccountMovementId" TEXT;

CREATE UNIQUE INDEX "FixedCostOccurrence_bankAccountMovementId_key"
ON "FixedCostOccurrence"("bankAccountMovementId");

ALTER TABLE "FixedCostOccurrence"
ADD CONSTRAINT "FixedCostOccurrence_bankAccountMovementId_fkey"
FOREIGN KEY ("bankAccountMovementId") REFERENCES "BankAccountMovement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
