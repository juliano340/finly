-- Personalização por ocorrência de lançamento fixo (forma de pagamento, cartão, conta e vencimento)
ALTER TABLE "FixedCostOccurrence" ADD COLUMN "paymentMethodOverride" "FixedCostPaymentMethod";
ALTER TABLE "FixedCostOccurrence" ADD COLUMN "cardIdOverride" TEXT;
ALTER TABLE "FixedCostOccurrence" ADD COLUMN "bankAccountIdOverride" TEXT;
ALTER TABLE "FixedCostOccurrence" ADD COLUMN "dueDateOverridden" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FixedCostOccurrence" ADD CONSTRAINT "FixedCostOccurrence_cardIdOverride_fkey" FOREIGN KEY ("cardIdOverride") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FixedCostOccurrence" ADD CONSTRAINT "FixedCostOccurrence_bankAccountIdOverride_fkey" FOREIGN KEY ("bankAccountIdOverride") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
