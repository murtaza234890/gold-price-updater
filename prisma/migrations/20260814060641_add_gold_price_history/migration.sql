-- CreateTable
CREATE TABLE "GoldPriceHistory" (
    "id" SERIAL NOT NULL,
    "price24k" DOUBLE PRECISION NOT NULL,
    "price22k" DOUBLE PRECISION NOT NULL,
    "price20k" DOUBLE PRECISION NOT NULL,
    "price18k" DOUBLE PRECISION NOT NULL,
    "price14k" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoldPriceHistory_updatedAt_idx" ON "GoldPriceHistory"("updatedAt");
