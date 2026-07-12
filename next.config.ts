import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for the Coolify/Docker deployment.
  output: "standalone",
};

export default nextConfig;
