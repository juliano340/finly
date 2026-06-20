CREATE INDEX "Transaction_userId_type_date_idx" ON "Transaction"("userId", "type", "date");
CREATE INDEX "CardInvoice_userId_month_idx" ON "CardInvoice"("userId", "month");
CREATE INDEX "FixedCost_userId_active_idx" ON "FixedCost"("userId", "active");
CREATE INDEX "FixedCostOccurrence_userId_month_idx" ON "FixedCostOccurrence"("userId", "month");
