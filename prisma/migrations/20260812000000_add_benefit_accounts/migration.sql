ALTER TYPE "BankAccountType" ADD VALUE 'BENEFIT';

ALTER TABLE "BankAccount" ADD COLUMN "benefitDailyRate" DECIMAL(19,2);
