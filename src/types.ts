import { Hex } from 'viem';

export type MarketParams = {
  loanToken: Hex;
  collateralToken: Hex;
  oracle: Hex;
  irm: Hex;
  lltv: bigint;
};

export type Position = {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
};
