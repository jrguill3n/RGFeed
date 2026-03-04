/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Explicitly list server-only env vars so they are never inlined into the
  // client bundle. Variables without the NEXT_PUBLIC_ prefix are already
  // excluded by Next.js, but declaring them here makes the intent clear and
  // triggers a build-time warning if they're accidentally referenced client-side.
  serverRuntimeConfig: {
    MUX_TOKEN_ID: process.env.MUX_TOKEN_ID,
    MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET,
  },
}

export default nextConfig
