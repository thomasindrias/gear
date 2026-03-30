import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@gear-cli/shared", "@gear/db"],
};

export default config;
