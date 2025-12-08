/** @type {import('next').NextConfig} */
import path from 'path'

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { externalDir: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-router-dom': path.resolve(process.cwd(), 'lib/routerCompat.js'),
      'student': path.resolve(process.cwd(), 'dsat-psat-lms-frontend-student/src'),
    }
    return config
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: '/api',
  },
}

export default nextConfig
