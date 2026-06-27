import type { NextConfig } from "next";
import path from "node:path";

// Optional sub-path deploy (e.g. /v3). Empty by default so local dev and the
// root deploy are unaffected; only the sub-path build sets NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Pin the workspace root to this project; a stray lockfile in the home dir
  // otherwise makes Next infer the wrong root.
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
