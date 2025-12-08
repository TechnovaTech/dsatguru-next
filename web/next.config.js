/** @type {import('next').NextConfig} */
const path = require('path');
const webpackLib = require('webpack');
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { externalDir: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-router-dom': path.resolve(__dirname, 'src/lib/routerCompat.js'),
      'student': path.resolve(__dirname, '../dsat-psat-lms-frontend-student/src'),
    };
    const envShim = {
      VITE_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
      VITE_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
      VITE_SECRET_KEY: process.env.NEXT_PUBLIC_SECRET_KEY || '',
      VITE_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
    };
    config.plugins = config.plugins || [];
    config.plugins.push(new webpackLib.DefinePlugin({ 'import.meta.env': JSON.stringify(envShim) }));
    return config;
  },
  async rewrites() {
    const target = process.env.API_INTERNAL_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig
