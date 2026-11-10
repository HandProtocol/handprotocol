import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  // /fairy-ball/ and /waiver/ export as folders with an index.html, served cleanly by Netlify.
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  outputFileTracingRoot: process.cwd(),
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
