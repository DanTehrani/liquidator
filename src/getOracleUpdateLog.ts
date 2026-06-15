import HyperEvmMultiFeedAdapterWithoutRoundsV4Abi from './abi/HyperEvmMultiFeedAdapterWithoutRoundsV4';
import MorphoChainlinkOracleV2Abi from './abi/MorphoChainlinkOracleV2Abi';
import { getLogs } from './utils';

const main = async () => {
  const logs = await getLogs({
    fromBlock: 37829420n,
    toBlock: 37829427n,
    address: '0x24c8964338Deb5204B096039147B8e8C3AEa42Cc',
    event: HyperEvmMultiFeedAdapterWithoutRoundsV4Abi.find(
      (
        abi
      ): abi is Extract<
        (typeof HyperEvmMultiFeedAdapterWithoutRoundsV4Abi)[number],
        { type: 'event'; name: 'ValueUpdate' }
      > => abi.type === 'event' && abi.name === 'ValueUpdate'
    )!,
  });

  for (const log of logs) {
    console.log(log.args);
  }
};

main();
