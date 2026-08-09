-- Store monetary values as fixed-point decimals. Existing values are rounded
-- to the application's two-decimal currency precision during conversion.
ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(19,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "BankAccount"
  ALTER COLUMN "initialBalance" DROP DEFAULT,
  ALTER COLUMN "overdraftLimit" DROP DEFAULT,
  ALTER COLUMN "initialBalance" TYPE DECIMAL(19,2) USING ROUND("initialBalance"::numeric, 2),
  ALTER COLUMN "overdraftLimit" TYPE DECIMAL(19,2) USING ROUND("overdraftLimit"::numeric, 2),
  ALTER COLUMN "initialBalance" SET DEFAULT 0,
  ALTER COLUMN "overdraftLimit" SET DEFAULT 0;

ALTER TABLE "BankAccountMovement"
  ALTER COLUMN "amount" TYPE DECIMAL(19,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "CardInvoice"
  ALTER COLUMN "amount" TYPE DECIMAL(19,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "FixedCost"
  ALTER COLUMN "defaultAmount" TYPE DECIMAL(19,2) USING ROUND("defaultAmount"::numeric, 2);

ALTER TABLE "FixedCostOccurrence"
  ALTER COLUMN "amount" TYPE DECIMAL(19,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "Budget"
  ALTER COLUMN "amount" TYPE DECIMAL(19,2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "ImportSession"
  ALTER COLUMN "invoiceTotal" TYPE DECIMAL(19,2) USING ROUND("invoiceTotal"::numeric, 2);

ALTER TABLE "ImportedTransaction"
  ALTER COLUMN "amount" TYPE DECIMAL(19,2) USING ROUND("amount"::numeric, 2);
