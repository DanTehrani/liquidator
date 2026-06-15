import { BaseError, ContractFunctionRevertedError, Hex } from 'viem';
import borrowers from '../borrowers.json';
import { getMarketParams, getPosition, liquidate } from './morpho';
import { sleep } from './utils';
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

const main = async () => {
  for (const borrower of borrowers) {
    const positionKey = getPositionKey({
      marketId: borrower.marketId as Hex,
      borrower: borrower.borrower as Hex,
    });

    if (getPositionsToSkip.has(positionKey)) {
      continue;
    }

    const getMarketParamsTimer = st('getMarketParams');
    const market = await getMarketParams({
      marketId: borrower.marketId as Hex,
    });
    ed(getMarketParamsTimer);

    const getPositionTimer = st('getPosition');
    const position = await getPosition({
      marketId: borrower.marketId as Hex,
      borrower: borrower.borrower as Hex,
    });
    ed(getPositionTimer);

    if (position.borrowShares === 0n) {
      getPositionsToSkip.add(positionKey);
      continue;
    }

    try {
      const liquidateResult = await liquidate({
        marketParams: market,
        borrower: borrower.borrower as Hex,
        seizedAssets: 0n,
        repaidShares: position.borrowShares,
        data: '0x',
      });

      logger.info('Liquidated position', {
        marketId: borrower.marketId,
        borrower: borrower.borrower,
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
        continue;
      }

      if (revertReason === 'position is healthy') {
        logger.info('Position is healthy');
      }

      if (revertReason === 'inconsistent input') {
        logger.error('Inconsistent input', {
          marketId: borrower.marketId,
          borrower: borrower.borrower,
          revertReason,
        });
        // Both seizedAssets and repaidShares set (or both zero)
        getPositionsToSkip.add(positionKey);
      }
    }

    await sleep(1000);
  }
};

main();
