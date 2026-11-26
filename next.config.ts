import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Photos are resized in the browser first; the server accepts up to the 5 MB storage limit.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  // Not launched yet: keep every page out of search engines (development/test builds are public).
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
