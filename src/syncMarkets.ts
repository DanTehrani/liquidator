import { Hex } from 'viem';
import { getMarket, getMarketParams } from './morpho';
import prisma from './prisma';
import { Prisma } from '@prisma/client';
import { safeLoop } from './utils';
import { logger } from './logger';

const syncMarkets = async () => {
  const existingMarketIds = await prisma.market.findMany({
    select: { id: true },
  });

  const marketIds = await prisma.position.findMany({
    distinct: ['marketId'],
    select: { marketId: true },
    where: {
      id: {
        notIn: existingMarketIds.map(market => market.id),
      },
    },
  });

  for (const marketId of marketIds) {
    const market = await getMarketParams({
      marketId: marketId.marketId as Hex,
    });

    const marketData: Prisma.MarketCreateInput = {
      id: marketId.marketId as Hex,
      loanToken: market.loanToken,
      collateralToken: market.collateralToken,
      oracle: market.oracle,
      irm: market.irm,
      lltv: market.lltv.toString(),
    };

    await prisma.market.upsert({
      where: { id: marketId.marketId as Hex },
      update: marketData,
      create: marketData,
    });
  }
};

const syncMarketsLoop = async () => {
  await safeLoop({
    fn: syncMarkets,
    interval: 60 * 1000, // 1 minute
  });
};

export default syncMarketsLoop;
