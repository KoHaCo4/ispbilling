import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["routeros-client", "node-routeros"],
};

export default nextConfig;
