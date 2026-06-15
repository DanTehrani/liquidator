import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Address } from 'viem';
import { isAddress } from 'viem';
import { MORPHO_ADDRESS } from './utils.js';

/** HyperEVM mainnet (Hyperliquid). https://docs.etherscan.io/supported-chains */
const HYPEREVM_CHAIN_ID = 999;

const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/v2/api';

type EtherscanContractSource = {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  CompilerType?: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  ContractFileName?: string;
};

type EtherscanApiResponse = {
  status: string;
  message: string;
  result: EtherscanContractSource[] | string;
};

export type DownloadedContract = {
  address: Address;
  contractName: string;
  outputDir: string;
  files: string[];
  isProxy: boolean;
  implementation?: Address;
};

export type DownloadContractParams = {
  address: Address;
  outputDir?: string;
  /** Also download implementation source when the address is a proxy. */
  includeImplementation?: boolean;
};

function getApiKey(): string {
  const apiKey = process.env.ETHERSCAN_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing API key. Set ETHERSCAN_API_KEY or HYPEREVMSCAN_API_KEY in .env (free key from hyperevmscan.io).'
    );
  }

  return apiKey;
}

export async function fetchContractSource(
  address: Address
): Promise<EtherscanContractSource> {
  const url = new URL(ETHERSCAN_V2_API_URL);
  url.searchParams.set('chainid', String(HYPEREVM_CHAIN_ID));
  url.searchParams.set('module', 'contract');
  url.searchParams.set('action', 'getsourcecode');
  url.searchParams.set('address', address);
  url.searchParams.set('apikey', getApiKey());

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `HyperEVMScan API request failed (${response.status} ${response.statusText})`
    );
  }

  const data = (await response.json()) as EtherscanApiResponse;

  if (data.status !== '1' || !Array.isArray(data.result)) {
    const error =
      typeof data.result === 'string'
        ? data.result
        : (data.message ?? 'Unknown API error');
    throw new Error(`HyperEVMScan API error: ${error}`);
  }

  const [contract] = data.result;
  if (!contract?.SourceCode?.trim()) {
    throw new Error(`No verified source code found for ${address}`);
  }

  return contract;
}

function parseSourceCode(
  sourceCode: string,
  contractName: string,
  contractFileName?: string
): Record<string, string> {
  const trimmed = sourceCode.trim();

  const tryParseJson = (json: string): Record<string, string> | null => {
    try {
      const parsed = JSON.parse(json) as {
        sources?: Record<string, { content: string }>;
      };

      if (!parsed.sources) return null;

      return Object.fromEntries(
        Object.entries(parsed.sources).map(([filePath, source]) => [
          filePath,
          source.content,
        ])
      );
    } catch {
      return null;
    }
  };

  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
    const files = tryParseJson(trimmed.slice(1, -1));
    if (files) return files;
  }

  if (trimmed.startsWith('{')) {
    const files = tryParseJson(trimmed);
    if (files) return files;
  }

  const fileName = contractFileName?.trim() || `${contractName}.sol`;
  return { [fileName]: trimmed };
}

function resolveOutputPath(baseDir: string, filePath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedFile = path.resolve(baseDir, filePath);

  if (
    resolvedFile !== resolvedBase &&
    !resolvedFile.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new Error(`Unsafe source file path: ${filePath}`);
  }

  return resolvedFile;
}

async function writeContractFiles(
  address: Address,
  contract: EtherscanContractSource,
  outputDir: string
): Promise<string[]> {
  const files = parseSourceCode(
    contract.SourceCode,
    contract.ContractName,
    contract.ContractFileName
  );

  await mkdir(outputDir, { recursive: true });

  const writtenFiles: string[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    const destination = resolveOutputPath(outputDir, filePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, 'utf8');
    writtenFiles.push(destination);
  }

  await writeFile(
    path.join(outputDir, 'abi.json'),
    JSON.stringify(JSON.parse(contract.ABI), null, 2),
    'utf8'
  );
  writtenFiles.push(path.join(outputDir, 'abi.json'));

  await writeFile(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(
      {
        address,
        contractName: contract.ContractName,
        compilerVersion: contract.CompilerVersion,
        compilerType: contract.CompilerType,
        optimizationUsed: contract.OptimizationUsed,
        runs: contract.Runs,
        constructorArguments: contract.ConstructorArguments,
        evmVersion: contract.EVMVersion,
        library: contract.Library,
        licenseType: contract.LicenseType,
        proxy: contract.Proxy === '1',
        implementation: contract.Implementation || null,
      },
      null,
      2
    ),
    'utf8'
  );
  writtenFiles.push(path.join(outputDir, 'metadata.json'));

  return writtenFiles;
}

export async function downloadContract({
  address,
  outputDir = path.join('contracts', address),
  includeImplementation = true,
}: DownloadContractParams): Promise<DownloadedContract> {
  if (!isAddress(address)) {
    throw new Error(`Invalid contract address: ${address}`);
  }

  const contract = await fetchContractSource(address);
  const files = await writeContractFiles(address, contract, outputDir);

  const isProxy = contract.Proxy === '1';
  let implementation: Address | undefined;

  if (
    includeImplementation &&
    isProxy &&
    contract.Implementation &&
    isAddress(contract.Implementation)
  ) {
    implementation = contract.Implementation;
    const implDir = path.join(outputDir, 'implementation');
    await downloadContract({
      address: implementation,
      outputDir: implDir,
      includeImplementation: false,
    });
  }

  return {
    address,
    contractName: contract.ContractName,
    outputDir,
    files,
    isProxy,
    implementation,
  };
}

const main = async () => {
  const address = '0x24c8964338Deb5204B096039147B8e8C3AEa42Cc';
  const outputDir = path.join('contracts', address);

  const result = await downloadContract({
    address,
    ...(outputDir ? { outputDir } : {}),
  });

  console.log(
    `Downloaded ${result.contractName} (${result.address}) to ${result.outputDir}`
  );
  console.log(`Files: ${result.files.length}`);
  if (result.isProxy && result.implementation) {
    console.log(`Proxy implementation: ${result.implementation}`);
  }
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
