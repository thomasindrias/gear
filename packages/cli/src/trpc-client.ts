import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { readConfig } from "./config.js";
import type {
  PublishInput,
  PublishOutput,
  DownloadInput,
  DownloadOutput,
  DeleteInput,
  DeleteOutput,
} from "./types/api.js";

const DEFAULT_REGISTRY = "https://gear-beige.vercel.app";

/**
 * Minimal type-safe interface for the Gear API client
 * Mirrors the tRPC router structure without requiring @gear/web dependency
 */
interface GearClient {
  profile: {
    publish: {
      mutate: (input: PublishInput) => Promise<PublishOutput>;
    };
    download: {
      query: (input: DownloadInput) => Promise<DownloadOutput>;
    };
    delete: {
      mutate: (input: DeleteInput) => Promise<DeleteOutput>;
    };
  };
}

export function createGearClient(): GearClient {
  const config = readConfig();
  const registryUrl = config.registry_url ?? DEFAULT_REGISTRY;

  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url: `${registryUrl}/api/trpc`,
        headers: () => {
          if (config.token) {
            return { authorization: `Bearer ${config.token}` };
          }
          return {};
        },
      }),
    ],
  }) as unknown as GearClient;
}
