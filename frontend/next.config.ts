import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Fixed: changed 'image' to 'images'
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          "backlyst-storage-622711945657-eu-west-2-an.s3.eu-west-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.eu-west-2.amazonaws.com",
        port: "",
        pathname: "/",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        port: "",
        pathname: "/",
      },
    ],
  },
};

export default nextConfig;
