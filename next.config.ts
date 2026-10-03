import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["./.env*", "./storage/**/*"] },
};

export default nextConfig;
