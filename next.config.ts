import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "*": ["./node_modules/better-sqlite3/**/*"],
  },
  // The dev server listens on every interface, while the browser uses 127.0.0.1.
  // Without this, Next blocks the HMR socket and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
