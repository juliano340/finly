CREATE TYPE "InvoiceCalculationMode" AS ENUM ('CALCULATED', 'ENTERED_TOTAL');
CREATE TYPE "InvoiceLifecycleStatus" AS ENUM ('ESTIMATED', 'OPEN', 'CLOSED', 'PAID');
CREATE TYPE "InvoiceItemKind" AS ENUM ('MANUAL', 'INSTALLMENT', 'FIXED_COST', 'IMPORTED', 'FORECAST');
CREATE TYPE "InvoiceItemPostingStatus" AS ENUM ('PROJECTED', 'POSTED');

ALTER TABLE "CardInvoice"
  ADD COLUMN "calculationMode" "InvoiceCalculationMode" NOT NULL DEFAULT 'ENTERED_TOTAL',
  ADD COLUMN "lifecycleStatus" "InvoiceLifecycleStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "enteredTotal" DECIMAL(19,2),
  ADD COLUMN "closedAt" TIMESTAMP(3);

UPDATE "CardInvoice"
SET "enteredTotal" = "amount",
    "lifecycleStatus" = CASE
      WHEN "status" = 'PAID' THEN 'PAID'::"InvoiceLifecycleStatus"
      ELSE 'OPEN'::"InvoiceLifecycleStatus"
    END;

CREATE TABLE "CardInvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "kind" "InvoiceItemKind" NOT NULL DEFAULT 'MANUAL',
  "postingStatus" "InvoiceItemPostingStatus" NOT NULL DEFAULT 'POSTED',
  "description" TEXT NOT NULL,
  "amount" DECIMAL(19,2) NOT NULL,
  "fixedCostOccurrenceId" TEXT,
  "importedTransactionId" TEXT,
  "installmentGroupId" TEXT,
  "installmentNumber" INTEGER,
  "installmentCount" INTEGER,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CardInvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CardInvoiceItem_fixedCostOccurrenceId_key" ON "CardInvoiceItem"("fixedCostOccurrenceId");
CREATE UNIQUE INDEX "CardInvoiceItem_importedTransactionId_key" ON "CardInvoiceItem"("importedTransactionId");
CREATE INDEX "CardInvoiceItem_invoiceId_postingStatus_idx" ON "CardInvoiceItem"("invoiceId", "postingStatus");
CREATE INDEX "CardInvoiceItem_userId_invoiceId_idx" ON "CardInvoiceItem"("userId", "invoiceId");

ALTER TABLE "CardInvoiceItem" ADD CONSTRAINT "CardInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CardInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardInvoiceItem" ADD CONSTRAINT "CardInvoiceItem_fixedCostOccurrenceId_fkey" FOREIGN KEY ("fixedCostOccurrenceId") REFERENCES "FixedCostOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CardInvoiceItem" ADD CONSTRAINT "CardInvoiceItem_importedTransactionId_fkey" FOREIGN KEY ("importedTransactionId") REFERENCES "ImportedTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CardInvoiceItem" ADD CONSTRAINT "CardInvoiceItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
