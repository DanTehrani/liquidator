import { Address, Hex } from 'viem';
import MorphoAbi from './abi/MorhpoAbi';
import { getPositionKey, getPublicClient, MORPHO_ADDRESS } from './utils';
import { MarketParams, Position } from './types';
import MorphoChainlinkOracleV2Abi from './abi/MorphoChainlinkOracleV2Abi';
import NodeCache from 'node-cache';

export const getMarket = async ({ marketId }: { marketId: Hex }) => {
  const client = getPublicClient();
  const market = await client.readContract({
    address: MORPHO_ADDRESS,
    abi: MorphoAbi,
    functionName: 'market',
    args: [marketId],
  });

  return market;
};

const cachedMarketParams = new Map<Hex, MarketParams>();

export const getMarketParams = async ({
  marketId,
}: {
  marketId: Hex;
}): Promise<MarketParams> => {
  const _cachedMarketParams = cachedMarketParams.get(marketId);

  if (_cachedMarketParams) {
    return _cachedMarketParams;
  }

  const client = getPublicClient();

  const _marketParams = await client.readContract({
    address: MORPHO_ADDRESS,
    abi: MorphoAbi,
    functionName: 'idToMarketParams',
    args: [marketId],
  });

  const marketParams = {
    loanToken: _marketParams[0],
    collateralToken: _marketParams[1],
    oracle: _marketParams[2],
    irm: _marketParams[3],
    lltv: _marketParams[4],
  };

  cachedMarketParams.set(marketId, marketParams);

  return marketParams;
};

export const liquidate = async ({
  marketParams,
  borrower,
  seizedAssets,
  repaidShares,
  data,
}: {
  marketParams: MarketParams;
  borrower: Hex;
  seizedAssets: bigint;
  repaidShares: bigint;
  data: Hex;
}) => {
  const client = getPublicClient();
  const result = await client.simulateContract({
    address: MORPHO_ADDRESS,
    abi: MorphoAbi,
    functionName: 'liquidate',
    args: [marketParams, borrower, seizedAssets, repaidShares, data],
  });

  return result;
};

const cachedPositions = new NodeCache({
  stdTTL: 10 * 60, // 10 minutes
});

export const getPosition = async ({
  marketId,
  borrower,
}: {
  marketId: Hex;
  borrower: Hex;
}): Promise<Position> => {
  const positionKey = getPositionKey({
    marketId,
    borrower,
  });

  const cachedPosition = cachedPositions.get(positionKey);

  if (cachedPosition) {
    return cachedPosition as Position;
  }

  const client = getPublicClient();
  const _position = await client.readContract({
    address: MORPHO_ADDRESS,
    abi: MorphoAbi,
    functionName: 'position',
    args: [marketId, borrower],
  });

  const position = {
    supplyShares: _position[0],
    borrowShares: _position[1],
    collateral: _position[2],
  };

  cachedPositions.set(positionKey, position);

  return position;
};

export const getOraclePrice = async ({
  oracle,
}: {
  oracle: Hex;
}): Promise<bigint> => {
  const client = getPublicClient();
  const price = await client.readContract({
    address: oracle,
    abi: MorphoChainlinkOracleV2Abi,
    functionName: 'price',
  });

  return price;
};
