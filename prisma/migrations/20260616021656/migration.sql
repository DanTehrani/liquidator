/*
  Warnings:

  - A unique constraint covering the columns `[logIndex,transactionHash]` on the table `Liquidation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `blockNumber` to the `Liquidation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `logIndex` to the `Liquidation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionHash` to the `Liquidation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Liquidation" ADD COLUMN     "blockNumber" BIGINT NOT NULL,
ADD COLUMN     "logIndex" INTEGER NOT NULL,
ADD COLUMN     "transactionHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Liquidation_logIndex_transactionHash_key" ON "Liquidation"("logIndex", "transactionHash");
