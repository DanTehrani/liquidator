import 'dotenv/config';

import { AbiEvent, type Log } from 'viem';
import MorphoAbi from './abi/MorhpoAbi.js';
import { getLogs, MORPHO_ADDRESS } from './utils.js';

const main = async () => {
  const logs = await getLogs({
    fromBlock: 37800000n,
    toBlock: 37898025n,
    address: MORPHO_ADDRESS,
    event: MorphoAbi.find(
      (
        abi
      ): abi is Extract<
        (typeof MorphoAbi)[number],
        { type: 'event'; name: 'Liquidate' }
      > => abi.type === 'event' && abi.name === 'Liquidate'
    )!,
  });

  for (const log of logs) {
    console.log(log.blockNumber);
  }
};

main();
