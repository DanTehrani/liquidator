import 'dotenv/config';
import { getLogs, MORPHO_ADDRESS } from './utils';
import MorphoAbi from './abi/MorhpoAbi';
import { Hex } from 'viem';
import fs from 'fs';

const borrowEvent = MorphoAbi.find(
  (
    abi
  ): abi is Extract<
    (typeof MorphoAbi)[number],
    { type: 'event'; name: 'Borrow' }
  > => abi.type === 'event' && abi.name === 'Borrow'
)!;

type Borrower = {
  marketId: Hex;
  borrower: Hex;
};

const main = async () => {
  const borrowLogs = await getLogs({
    fromBlock: 37800000n,
    toBlock: 37896669n,
    address: MORPHO_ADDRESS,
    event: borrowEvent,
  });

  const borrowers: Borrower[] = [];

  for (const log of borrowLogs) {
    if (log.args.id && log.args.receiver) {
      borrowers.push({
        marketId: log.args.id,
        borrower: log.args.receiver,
      });
    }
  }

  fs.writeFileSync('borrowers.json', JSON.stringify(borrowers, null, 2));

  /*
  const marketId =
    '0xCAC72237BF1391FD999E993CB8824DC38D4EF941856FC9C2680B96B8961B133B';

  const borrower = '0x74c0A7D94CE0290803a3f47fAb1eA36f2d76d6A4';

  const market = await getMarketParams({
    marketId,
  });

  console.log(market);

  const position = await getPosition({
    marketId,
    borrower,
  });

  const oracleAddress = '0xF2cB09EDF4D07b2E867919d2cF5Cac0486F6Eb61';

  const liquidateResult = await liquidate({
    marketParams: market,
    borrower,
    seizedAssets: 0n,
    repaidShares: position.borrowShares,
    data: '0x',
  });

  console.log(position);
  console.log(liquidateResult);
  */
};

main();
