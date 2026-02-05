import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/chris-delicious-library',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
