-- Bring the production schema in line with the transaction reversal and
-- auto-created invoice fields used by the generated Prisma client.
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'REVERSED');

ALTER TABLE "Transaction"
ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "CardInvoice"
ADD COLUMN "autoCreated" BOOLEAN NOT NULL DEFAULT false;
