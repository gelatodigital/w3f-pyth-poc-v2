import { Octokit } from "octokit";
import YAML from "yaml";
import { EvmPriceServiceConnection, Price } from "@pythnetwork/pyth-evm-js";

export interface PythConfigStorage {
  timestamp: number;
  pythConfig: PythConfig;
}
export interface PythConfig {
  pythNetworkAddress: string;
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

export const shouldFetchPythConfig = (
  pythConfigStorage: PythConfigStorage
): boolean => {
  const isNotFoundInStorage = pythConfigStorage.pythConfig === undefined;
  return (
    isNotFoundInStorage ||
    Date.now() / 1000 - pythConfigStorage.timestamp >
      pythConfigStorage.pythConfig.configRefreshRateInSeconds
  );
};

export const fetchPythConfigIfNecessary = async (
  storage: Web3Storage,
  gistId: string
): Promise<PythConfig> => {
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
    console.log(`storing pythConfigStorageValue: ${pythConfigStorageValue}`);
    await storage.set("pythConfig", pythConfigStorageValue);
  } else {
    pythConfig = pythConfigStorage.pythConfig;
  }
  return pythConfig;
};

export const getCurrentPrices = async (
  priceIds: string[],
  connection: EvmPriceServiceConnection
): Promise<Map<string, Price> | undefined> => {
  const check = await connection.getLatestPriceFeeds(priceIds);
  if (check === undefined) {
    return undefined;
  }

  console.log(`check: ${JSON.stringify(check)}`);

  return check
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
};

export const getLastPrices = async (
  priceIds: string[],
  storage: Web3Storage
): Promise<Map<string, Price>> => {
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
};
