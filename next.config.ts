import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "true";
const pagesBasePath = process.env.PAGES_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
  ...(pagesBasePath
    ? {
        basePath: pagesBasePath,
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
