/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Increase body size limit for large bulk question uploads (Mathpix batches)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  async redirects() {
    return [
      {
        source: '/blog.html',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blog.html',
        destination: '/blog',
        permanent: true,
      },
      // Old DSAT program URLs to new SEO-friendly URLs
      {
        source: '/programs/dsat/live-bootcamp-course',
        destination: '/sat-bootcamp-courses',
        permanent: true,
      },
      {
        source: '/programs/dsat/live-prep-course',
        destination: '/sat-live-prep-course',
        permanent: true,
      },
      {
        source: '/programs/dsat/individual-tutoring',
        destination: '/sat-individual-tutoring',
        permanent: true,
      },
      {
        source: '/programs/dsat/reading-and-writing-section',
        destination: '/sat-reading-writing',
        permanent: true,
      },
      {
        source: '/programs/dsat/math-section',
        destination: '/sat-math',
        permanent: true,
      },
      {
        source: '/programs/dsat/practice-test',
        destination: '/free-sat-practice-test',
        permanent: true,
      },
      {
        source: '/programs/dsat/mock-test',
        destination: '/free-sat-mock-test',
        permanent: true,
      },
      {
        source: '/programs/dsat/diagnostic-test',
        destination: '/free-sat-diagnostic-test',
        permanent: true,
      },
      {
        source: '/programs/dsat/study-guide',
        destination: '/sat-study-guide',
        permanent: true,
      },
      // Old PSAT program URLs to new SEO-friendly URLs
      {
        source: '/programs/psat',
        destination: '/psat',
        permanent: true,
      },
      {
        source: '/programs/psat/live-bootcamp-course',
        destination: '/psat/bootcamp-courses',
        permanent: true,
      },
      {
        source: '/programs/psat/live-prep-course',
        destination: '/psat/live-prep-course',
        permanent: true,
      },
      {
        source: '/programs/psat/individual-tutoring',
        destination: '/psat/individual-tutoring',
        permanent: true,
      },
      {
        source: '/programs/psat/reading-and-writing-section',
        destination: '/psat/reading-writing',
        permanent: true,
      },
      {
        source: '/programs/psat/math-section',
        destination: '/psat/math',
        permanent: true,
      },
      {
        source: '/programs/psat/practice-test',
        destination: '/free-psat-practice-test',
        permanent: true,
      },
      {
        source: '/programs/psat/mock-test',
        destination: '/free-psat-mock-test',
        permanent: true,
      },
      {
        source: '/programs/psat/diagnostic-test',
        destination: '/free-psat-diagnostic-test',
        permanent: true,
      },
      {
        source: '/programs/psat/study-guide',
        destination: '/psat-study-guide',
        permanent: true,
      },
      // Blog URL redirects
      {
        source: '/blog/digital-sat-study-plan-8-weeks',
        destination: '/blog/8-weeks-digital-sat-study-plan',
        permanent: true,
      },
      {
        source: '/blog/digital-sat-math-mistakes',
        destination: '/blog/10-common-digital-sat-math-mistakes',
        permanent: true,
      },
      {
        source: '/blog/digital-sat-reading-strategies',
        destination: '/blog/digital-sat-reading-writing-strategies',
        permanent: true,
      },
      {
        source: '/blog/using-practice-tests-effectively',
        destination: '/blog/digital-sat-practice-tests-right-way',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; frame-src https:; upgrade-insecure-requests",
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; frame-src https:; upgrade-insecure-requests",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
