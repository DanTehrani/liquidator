import {
  type AbiEvent,
  createPublicClient,
  type GetLogsReturnType,
  http,
  type Address,
  Hex,
} from 'viem';
import { hyperliquid } from 'viem/chains';
import { logger } from './logger';

export const MORPHO_ADDRESS =
  '0x68e37de8d93d3496ae143f2e900490f6280c57cd' as const satisfies Address;

export const getPositionKey = ({
  marketId,
  borrower,
}: {
  marketId: Hex;
  borrower: Hex;
}): string => {
  return `${marketId}-${borrower}`;
};

const getRpcUrl = (): string | undefined => {
  const alchemyKey = process.env.ALCHEMY_API_KEY;

  if (alchemyKey) {
    return `https://hyperliquid-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  }

  return undefined;
};

export const getPublicClient = () => {
  return createPublicClient({
    chain: hyperliquid,
    transport: http(getRpcUrl()),
  });
};

export const getLogs = async <const TEvent extends AbiEvent>({
  fromBlock,
  toBlock,
  address,
  event,
}: {
  fromBlock: bigint;
  toBlock: bigint;
  address: Address;
  event: TEvent;
}): Promise<GetLogsReturnType<TEvent>> => {
  const client = getPublicClient();

  const blockRange = 1_000n;

  const logs = [] as GetLogsReturnType<TEvent>;

  for (let start = fromBlock; start <= toBlock; start += blockRange) {
    const end =
      start + blockRange - 1n > toBlock ? toBlock : start + blockRange - 1n;

    const chunk = await client.getLogs({
      address,
      event,
      fromBlock: start,
      toBlock: end,
    });

    logs.push(...chunk);
  }

  return logs;
};

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const safeLoop = async ({
  fn,
  interval,
}: {
  fn: () => Promise<void>;
  interval: number;
}) => {
  while (true) {
    try {
      await fn();
    } catch (error) {
      logger.error(`error in safeLoop ${error} `, { error });
    }
    await sleep(interval);
  }
};
