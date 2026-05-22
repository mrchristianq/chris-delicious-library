import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "true";
const isNativeBuild = process.env.NEXT_PUBLIC_NATIVE_APP === "true";
const pagesBasePath = process.env.PAGES_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  ...(isStaticExport || isNativeBuild
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
  experimental: {
    turbopackMinify: false,
  },
};

export default nextConfig;
