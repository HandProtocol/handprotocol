import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack to this package, otherwise Next.js walks up the tree and
  // finds /home/koh/Documents/package-lock.json (parent monorepo) and warns.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
