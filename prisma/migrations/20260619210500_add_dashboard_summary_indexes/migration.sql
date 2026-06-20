CREATE INDEX "BankAccountMovement_userId_type_idx" ON "BankAccountMovement"("userId", "type");
CREATE INDEX "BankAccountMovement_bankAccountId_userId_date_idx" ON "BankAccountMovement"("bankAccountId", "userId", "date");
CREATE INDEX "CardInvoice_userId_status_dueDate_idx" ON "CardInvoice"("userId", "status", "dueDate");
CREATE INDEX "FixedCostOccurrence_userId_status_month_idx" ON "FixedCostOccurrence"("userId", "status", "month");
