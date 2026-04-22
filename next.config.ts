import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  allowedDevOrigins: ["192.168.1.9"],
};

export default nextConfig;
