import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // The dev server is reached through a proxied preview origin, not localhost. Next blocks
  // its own dev resources (HMR, font files) from unfamiliar origins by default, which
  // silently breaks hot reload and webfonts in the hosted preview.
  allowedDevOrigins: ["*.e2b.app", "localhost:3000"],
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
