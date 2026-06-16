/*
  Warnings:

  - A unique constraint covering the columns `[logIndex,transactionHash]` on the table `Position` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `blockNumber` to the `Position` table without a default value. This is not possible if the table is not empty.
  - Added the required column `logIndex` to the `Position` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplyShares` to the `Position` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionHash` to the `Position` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "blockNumber" BIGINT NOT NULL,
ADD COLUMN     "logIndex" INTEGER NOT NULL,
ADD COLUMN     "supplyShares" BIGINT NOT NULL,
ADD COLUMN     "transactionHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Position_logIndex_transactionHash_key" ON "Position"("logIndex", "transactionHash");
