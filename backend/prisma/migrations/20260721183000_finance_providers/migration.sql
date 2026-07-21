CREATE TABLE "FinanceProviderConnection" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT NOT NULL DEFAULT '',
    "productsJson" TEXT NOT NULL DEFAULT '[]',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceProviderConnection_userId_provider_key" ON "FinanceProviderConnection"("userId", "provider");

CREATE INDEX "FinanceProviderConnection_userId_idx" ON "FinanceProviderConnection"("userId");

ALTER TABLE "FinanceProviderConnection" ADD CONSTRAINT "FinanceProviderConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
