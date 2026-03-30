import { createTRPCClient, httpBatchLink } from "@trpc/client";
// TODO: Import AppRouter type once @gear/web package is created
// import type { AppRouter } from "@gear/web/server/root.js";
import { readConfig } from "./config.js";

const DEFAULT_REGISTRY = "https://gear.sh";

export function createGearClient() {
  const config = readConfig();
  const registryUrl = config.registry_url ?? DEFAULT_REGISTRY;

  // TODO: Type as AppRouter once web package is available
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
  });
}
