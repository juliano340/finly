-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN "overdraftLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FixedCostOccurrence" ADD COLUMN "deletedAt" TIMESTAMP(3);
