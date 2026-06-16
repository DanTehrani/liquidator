-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "borrower" TEXT NOT NULL,
    "borrowShares" BIGINT NOT NULL,
    "collateral" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liquidation" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "borrower" TEXT NOT NULL,
    "seizedAssets" BIGINT NOT NULL,
    "repaidShares" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liquidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "loanToken" TEXT NOT NULL,
    "collateralToken" TEXT NOT NULL,
    "oracle" TEXT NOT NULL,
    "irm" TEXT NOT NULL,
    "lltv" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);
