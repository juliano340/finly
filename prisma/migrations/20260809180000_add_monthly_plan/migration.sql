-- CreateTable
CREATE TABLE "MonthlyPlan" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "incomeOverride" DECIMAL(19,2),
    "savingsGoal" DECIMAL(19,2) NOT NULL,
    "safetyMargin" DECIMAL(19,2) NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPlan_month_userId_key"
ON "MonthlyPlan"("month", "userId");

-- AddForeignKey
ALTER TABLE "MonthlyPlan"
ADD CONSTRAINT "MonthlyPlan_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep schema ownership separate from runtime access when production roles exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finly_owner') THEN
    ALTER TABLE "MonthlyPlan" OWNER TO finly_owner;
  END IF;
END
$$;

DO $$
DECLARE
  runtime_role TEXT;
BEGIN
  FOREACH runtime_role IN ARRAY ARRAY['finly_app', 'finly_runtime']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
      EXECUTE format('REVOKE CREATE ON SCHEMA public FROM %I', runtime_role);
      EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', runtime_role);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "MonthlyPlan" TO %I',
        runtime_role
      );
    END IF;
  END LOOP;
END
$$;
