-- AlterTable
ALTER TABLE "CardInvoice" ADD COLUMN     "importSessionId" TEXT;

-- CreateTable
CREATE TABLE "ImportSession" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "bank" TEXT,
    "invoiceTotal" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "rawText" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedTransaction" (
    "id" TEXT NOT NULL,
    "importSessionId" TEXT NOT NULL,
    "cardIdentifier" TEXT,
    "date" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT,
    "rawLine" TEXT NOT NULL,
    "categoryId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescriptionMapping" (
    "id" TEXT NOT NULL,
    "normalizedDesc" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "importSessionId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescriptionMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSession_userId_createdAt_idx" ON "ImportSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportedTransaction_importSessionId_idx" ON "ImportedTransaction"("importSessionId");

-- CreateIndex
CREATE INDEX "ImportedTransaction_userId_categoryId_idx" ON "ImportedTransaction"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "DescriptionMapping_userId_idx" ON "DescriptionMapping"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DescriptionMapping_normalizedDesc_userId_key" ON "DescriptionMapping"("normalizedDesc", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardInvoice_importSessionId_key" ON "CardInvoice"("importSessionId");

-- AddForeignKey
ALTER TABLE "CardInvoice" ADD CONSTRAINT "CardInvoice_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "ImportSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionMapping" ADD CONSTRAINT "DescriptionMapping_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionMapping" ADD CONSTRAINT "DescriptionMapping_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "ImportSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionMapping" ADD CONSTRAINT "DescriptionMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
