import withSerwist from '@serwist/next'

const withSerwistConfig = withSerwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['images.skater-stats.com'],
  },
}

export default {
  ...withSerwistConfig(nextConfig),
  output: 'standalone',
}
