import 'dotenv/config';
import { getLogs, getPublicClient, MORPHO_ADDRESS, safeLoop } from './utils';
import MorphoAbi from './abi/MorhpoAbi';
import { Hex } from 'viem';
import fs from 'fs';
import { getPosition } from './morpho';
import prisma from './prisma';
import { setDefaultResultOrder } from 'dns';
import { logger } from './logger';
import { Prisma } from '@prisma/client';

const borrowEvent = MorphoAbi.find(
  (
    abi
  ): abi is Extract<
    (typeof MorphoAbi)[number],
    { type: 'event'; name: 'Borrow' }
  > => abi.type === 'event' && abi.name === 'Borrow'
)!;

type Borrower = {
  marketId: Hex;
  borrower: Hex;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hex;
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
};

const START_BLOCK = 30000000n;

const getLatestSavedBlock = async () => {
  const latestSavedBlock = await prisma.position.findFirst({
    orderBy: { blockNumber: 'desc' },
    select: { blockNumber: true },
  });

  return latestSavedBlock?.blockNumber ?? START_BLOCK;
};

const syncPositions = async () => {
  const client = getPublicClient();
  const latestBlock = await client.getBlockNumber();

  const chunkSize = 10_000n;

  const startBlock = await getLatestSavedBlock();

  for (let block = startBlock; block < latestBlock; block += chunkSize) {
    const toBlock =
      block + chunkSize - 1n > latestBlock
        ? latestBlock
        : block + chunkSize - 1n;

    const borrowLogs = await getLogs({
      fromBlock: block,
      toBlock,
      address: MORPHO_ADDRESS,
      event: borrowEvent,
    });

    const borrowers: Prisma.PositionCreateManyInput[] = [];

    for (const log of borrowLogs) {
      if (log.args.id && log.args.receiver) {
        const position = await getPosition({
          marketId: log.args.id,
          borrower: log.args.receiver,
        });

        if (position.borrowShares > 0n) {
          borrowers.push({
            marketId: log.args.id,
            borrower: log.args.receiver,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            transactionHash: log.transactionHash,
            supplyShares: position.supplyShares.toString(),
            borrowShares: position.borrowShares.toString(),
            collateral: position.collateral.toString(),
          });
        }
      }
    }

    const createdPositions = await prisma.position.createMany({
      data: borrowers,
      skipDuplicates: true,
    });

    logger.info(`Created ${createdPositions.count} positions`);
  }
};

const syncPositionsLoop = async () => {
  await safeLoop({
    fn: syncPositions,
    interval: 60 * 1000, // 1 minute
  });
};

export default syncPositionsLoop;
