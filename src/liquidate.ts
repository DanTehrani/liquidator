import { BaseError, ContractFunctionRevertedError, Hex } from 'viem';
import borrowers from '../borrowers.json';
import { getMarketParams, getPosition, liquidate } from './morpho';
import { safeLoop, sleep } from './utils';
import { logger } from './logger';
import { ed, st } from './lib/timer';

const getPositionKey = ({
  marketId,
  borrower,
}: {
  marketId: Hex;
  borrower: Hex;
}): string => {
  return `${marketId}-${borrower}`;
};

const getPositionsToSkip = new Set<string>();

const liquidatePosition = async ({
  marketId,
  borrower,
}: {
  marketId: Hex;
  borrower: Hex;
}) => {
  const positionKey = getPositionKey({
    marketId,
    borrower,
  });

  if (getPositionsToSkip.has(positionKey)) {
    return;
  }

  const getMarketParamsTimer = st('getMarketParams');
  const market = await getMarketParams({
    marketId,
  });
  ed(getMarketParamsTimer);

  const getPositionTimer = st('getPosition');
  const position = await getPosition({
    marketId,
    borrower,
  });
  ed(getPositionTimer);

  if (position.borrowShares === 0n) {
    getPositionsToSkip.add(positionKey);
    return;
  }

  try {
    const liquidateResult = await liquidate({
      marketParams: market,
      borrower,
      seizedAssets: 0n,
      repaidShares: position.borrowShares,
      data: '0x',
    });

    logger.info('Liquidated position', {
      marketId,
      borrower,
      liquidateResult,
    });
  } catch (error) {
    let revertReason: string | undefined;

    if (error instanceof BaseError) {
      const revertError = error.walk(
        e => e instanceof ContractFunctionRevertedError
      );

      if (revertError instanceof ContractFunctionRevertedError) {
        revertReason = revertError.reason ?? revertError.data?.errorName;
      }
    }

    if (!revertReason) {
      logger.error('Unknown error:', error);
      return;
    }

    if (revertReason === 'position is healthy') {
      logger.info('Position is healthy');
      return;
    }

    if (revertReason === 'inconsistent input') {
      logger.error('Inconsistent input', {
        marketId,
        borrower,
        revertReason,
      });
      // Both seizedAssets and repaidShares set (or both zero)
      getPositionsToSkip.add(positionKey);
    }
  }
};

const liquidateAll = async () => {
  for (const borrower of borrowers) {
    try {
      await liquidatePosition({
        marketId: borrower.marketId as Hex,
        borrower: borrower.borrower as Hex,
      });
    } catch (error) {
      logger.error('Error liquidating position', {
        error,
      });
    }

    await sleep(1000);
  }
};

const liquidateLoop = async () => {
  await safeLoop({
    fn: liquidateAll,
    interval: 1 * 1000,
  });
};

export default liquidateLoop;
