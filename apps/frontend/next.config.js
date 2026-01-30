/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  // Environment variables are automatically available via process.env in Next.js
  // No need to explicitly set them in env object for NEXT_PUBLIC_* variables
  // Ensure public folder is included in standalone build
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*'],
    },
  },
}

module.exports = nextConfig

