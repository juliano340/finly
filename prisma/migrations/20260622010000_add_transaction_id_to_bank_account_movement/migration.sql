-- AlterTable
ALTER TABLE "BankAccountMovement" ADD COLUMN "transactionId" TEXT;

-- AddForeignKey
ALTER TABLE "BankAccountMovement" ADD CONSTRAINT "BankAccountMovement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
