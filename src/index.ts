import syncMarkets from './syncMarkets';
import syncPositions from './syncPositions';
import syncLiquidations from './syncLiquidations';
import liquidateLoop from './liquidate';

const index = async () => {
  await Promise.all([
    liquidateLoop(),
    syncMarkets(),
    syncPositions(),
    syncLiquidations(),
  ]);
};

index();
