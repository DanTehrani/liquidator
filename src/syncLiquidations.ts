import 'dotenv/config';
import { getLogs, getPublicClient, MORPHO_ADDRESS, safeLoop } from './utils';
import MorphoAbi from './abi/MorhpoAbi';
import { Hex } from 'viem';
import prisma from './prisma';
import { logger } from './logger';

const liquidateEvent = MorphoAbi.find(
  (
    abi
  ): abi is Extract<
    (typeof MorphoAbi)[number],
    { type: 'event'; name: 'Liquidate' }
  > => abi.type === 'event' && abi.name === 'Liquidate'
)!;

type LiquidationRecord = {
  marketId: Hex;
  borrower: Hex;
  seizedAssets: bigint;
  repaidShares: bigint;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hex;
};

const START_BLOCK = 30_000_000n;

const getLatestSavedBlock = async () => {
  const latestSavedBlock = await prisma.position.findFirst({
    orderBy: { blockNumber: 'desc' },
    select: { blockNumber: true },
  });

  return latestSavedBlock?.blockNumber ?? START_BLOCK;
};

const syncLiquidations = async () => {
  const client = getPublicClient();
  const latestBlock = await client.getBlockNumber();

  const startBlock = await getLatestSavedBlock();

  const chunkSize = 10_000n;

  for (let block = startBlock; block <= latestBlock; block += chunkSize) {
    const toBlock =
      block + chunkSize - 1n > latestBlock
        ? latestBlock
        : block + chunkSize - 1n;

    const liquidateLogs = await getLogs({
      fromBlock: block,
      toBlock,
      address: MORPHO_ADDRESS,
      event: liquidateEvent,
    });

    const liquidations: LiquidationRecord[] = [];

    for (const log of liquidateLogs) {
      if (
        log.args.id &&
        log.args.borrower &&
        log.args.seizedAssets !== undefined &&
        log.args.repaidShares !== undefined
      ) {
        liquidations.push({
          marketId: log.args.id,
          borrower: log.args.borrower,
          seizedAssets: log.args.seizedAssets,
          repaidShares: log.args.repaidShares,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          transactionHash: log.transactionHash,
        });
      }
    }

    if (liquidations.length > 0) {
      const createdLiquidations = await prisma.liquidation.createMany({
        data: liquidations,
        skipDuplicates: true,
      });

      logger.info(`Created ${createdLiquidations.count} liquidations`);
    }
  }
};

const syncLiquidationsLoop = async () => {
  await safeLoop({
    fn: syncLiquidations,
    interval: 60 * 1000,
  });
};

export default syncLiquidationsLoop;
