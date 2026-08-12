ALTER TABLE "CardInvoiceItem" ADD COLUMN "transactionId" TEXT;

CREATE UNIQUE INDEX "CardInvoiceItem_transactionId_key" ON "CardInvoiceItem"("transactionId");

ALTER TABLE "CardInvoiceItem" ADD CONSTRAINT "CardInvoiceItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
