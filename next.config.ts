import type { NextConfig } from "next";

// v1 is kept online for comparison at /v1, next to the live site at /.
const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
