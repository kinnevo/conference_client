/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Railway automatically sets PORT
  // Next.js will use it via: next start -p $PORT

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },

  // Enable standalone output for better Railway performance
  output: 'standalone',
}

module.exports = nextConfig
