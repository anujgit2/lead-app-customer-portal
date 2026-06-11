import type { NextConfig } from "next";

const API_BACKEND_URL =
  process.env.API_BACKEND_URL ?? "http://leads-services.einfra.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${API_BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
