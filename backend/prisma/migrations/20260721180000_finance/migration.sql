CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAccountBalance" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccountBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCash" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCash_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceDebt" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "personName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BYN',
    "direction" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceDebt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceAccount_userId_key_key" ON "FinanceAccount"("userId", "key");

CREATE INDEX "FinanceAccount_userId_sortOrder_idx" ON "FinanceAccount"("userId", "sortOrder");

CREATE UNIQUE INDEX "FinanceAccountBalance_accountId_currency_key" ON "FinanceAccountBalance"("accountId", "currency");

CREATE INDEX "FinanceAccountBalance_accountId_idx" ON "FinanceAccountBalance"("accountId");

CREATE UNIQUE INDEX "FinanceCash_userId_currency_key" ON "FinanceCash"("userId", "currency");

CREATE INDEX "FinanceCash_userId_idx" ON "FinanceCash"("userId");

CREATE INDEX "FinanceDebt_userId_sortOrder_idx" ON "FinanceDebt"("userId", "sortOrder");

ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceAccountBalance" ADD CONSTRAINT "FinanceAccountBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceCash" ADD CONSTRAINT "FinanceCash_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceDebt" ADD CONSTRAINT "FinanceDebt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
