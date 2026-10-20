import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev badge would otherwise show up in Puppeteer thumbnails.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      // Only the global stylesheet goes through Tailwind; component styles are plain SCSS modules.
      "**/app/globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
