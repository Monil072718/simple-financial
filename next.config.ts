import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // allow production builds to succeed even if ESLint finds problems
    ignoreDuringBuilds: true,
  },
  typescript: {
    // allow production builds to succeed even if there are TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
