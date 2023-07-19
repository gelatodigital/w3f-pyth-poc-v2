import { Octokit } from "octokit";
import YAML from "yaml";
import { EvmPriceServiceConnection, Price } from "@pythnetwork/pyth-evm-js";

export interface PythConfigStorage {
  timestamp: number;
  pythConfig: PythConfig;
}
export interface PythConfig {
  pythNetworkAddress: string;
  debug: boolean;
  priceServiceEndpoint: string;
  configRefreshRateInSeconds: number;
  validTimePeriodSeconds: number;
  deviationThresholdBps: number;
  priceIds: string[];
}

export const addLeading0x = (id: string): string => {
  if (id.startsWith("0x")) {
    return id;
  }
  return "0x" + id;
};

export interface Web3Storage {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function shouldFetchPythConfig(
  pythConfigStorage: PythConfigStorage
): boolean {
  const isNotFoundInStorage = pythConfigStorage.pythConfig === undefined;
  return (
    isNotFoundInStorage ||
    Date.now() / 1000 - pythConfigStorage.timestamp >
      pythConfigStorage.pythConfig.configRefreshRateInSeconds
  );
}

export async function fetchPythConfigIfNecessary(
  storage: Web3Storage,
  gistId: string
): Promise<PythConfig> {
  const octokit = new Octokit();
  let pythConfig: PythConfig | undefined;
  let pythConfigStorage = JSON.parse(
    (await storage.get("pythConfig")) ?? "{}"
  ) as PythConfigStorage;

  if (shouldFetchPythConfig(pythConfigStorage)) {
    const gistDetails = await octokit.rest.gists.get({ gist_id: gistId });
    const files = gistDetails.data.files;
    if (!files) throw new Error(`No files in gist`);
    for (const file of Object.values(files)) {
      if (file?.filename === "config.yaml" && file.content) {
        pythConfig = YAML.parse(file.content);
        break;
      }
    }

    if (!pythConfig) throw new Error(`No config.yaml loaded for PythConfig`);
    pythConfigStorage = {
      timestamp: Date.now() / 1000,
      pythConfig: pythConfig,
    };
    const pythConfigStorageValue = JSON.stringify(pythConfigStorage);
    if (pythConfig.debug) {
      console.debug(
        `storing fetched pythConfigStorageValue: ${pythConfigStorageValue}`
      );
    }
    await storage.set("pythConfig", pythConfigStorageValue);
  } else {
    pythConfig = pythConfigStorage.pythConfig;
    if (pythConfig.debug) {
      console.debug("using pythConfig from storage");
    }
  }
  return pythConfig;
}

export async function getCurrentPrices(
  priceIds: string[],
  connection: EvmPriceServiceConnection,
  debug: boolean
): Promise<Map<string, Price> | undefined> {
  const latestPriceFeeds = await connection.getLatestPriceFeeds(priceIds);
  if (latestPriceFeeds === undefined) {
    return undefined;
  }
  if (debug) {
    console.debug(`latestPriceFeeds: ${JSON.stringify(latestPriceFeeds)}`);
  }

  return latestPriceFeeds
    .map((pf) => {
      return {
        id: pf.id,
        price: pf.getPriceUnchecked(),
      };
    })
    .filter((pf) => {
      return pf !== undefined && pf.price !== undefined;
    })
    .reduce((acc, pf) => {
      acc.set(addLeading0x(pf.id), pf.price);
      return acc;
    }, new Map<string, Price>());
}

export async function getLastPrices(
  priceIds: string[],
  storage: Web3Storage
): Promise<Map<string, Price>> {
  return (
    await Promise.all(
      priceIds.map(async (priceId) => {
        const storedValue = await storage.get(priceId);
        return { priceId, storedValue };
      })
    )
  )
    .filter((p) => p.storedValue !== undefined)
    .reduce((acc, priceInfo) => {
      const price = Price.fromJson(JSON.parse(priceInfo.storedValue!));
      acc.set(priceInfo.priceId, price);
      return acc;
    }, new Map<string, Price>());
}
