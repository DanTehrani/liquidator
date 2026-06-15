import { AbiEvent, Log } from 'viem';
import { getLogs } from './utils';
import MorphoAbi from './abi/MorhpoAbi';
import { MORPHO_ADDRESS } from './utils';

export const getCreateMarketLogs = async ({
  fromBlock,
  toBlock,
}: {
  fromBlock: bigint;
  toBlock: bigint;
}): Promise<Log[]> => {
  const logs = await getLogs({
    fromBlock,
    toBlock,
    address: MORPHO_ADDRESS,
    event: MorphoAbi.find(
      abi => abi.type === 'event' && abi.name === 'CreateMarket'
    ) as AbiEvent,
  });

  return logs;
};
