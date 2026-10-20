import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: ["*.bizloandev.local", "**.einfra.local"],
  env: {
    APP_PUBLIC_URL: process.env.APP_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_PUBLIC_URL ?? "",
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/s/:token((?!link$)[^/]+)",
          destination: "/s/link",
        },
        {
          source: "/shared/:token((?!link(?:/|$))[^/]+)",
          destination: "/shared/link",
        },
        {
          source: "/documents/:id((?!view(?:/|$))[^/]+)",
          destination: "/documents/view",
        },
        {
          source: "/profiles/:id((?!(?:view|new)(?:/|$))[^/]+)",
          destination: "/profiles/view",
        },
        {
          source: "/t/:tenant((?!site$)[^/]+)",
          destination: "/t/site",
        },
      ],
    };
  },
};

export default nextConfig;