const withSerwist = require("@serwist/next").default;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.skater-stats.com'],
  },
};

module.exports = withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
})(nextConfig);
