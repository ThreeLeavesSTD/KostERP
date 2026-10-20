import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Keep dev assets separate so a production build cannot remove files a
  // running `next dev` server still references. NEXT_DIST_DIR remains useful
  // for isolated verification runs.
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  rewrites: async () => {
    return [
      {
        source: "/:path((?!api|_next|favicon.ico).*)",
        destination: "/",
      },
    ];
  },
};

export default nextConfig;
