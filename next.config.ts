import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: 'standalone', // Enable standalone output for Docker
  productionBrowserSourceMaps: false,
  // next-swagger-doc globs the API route source files at request time to build
  // the OpenAPI spec. Standalone/serverless output only bundles files Next can
  // trace through imports, so those source .ts files get pruned unless we
  // force-include them here - without this, /api/admin/openapi returns an
  // empty spec in any deployed (non-dev) build.
  outputFileTracingIncludes: {
    '/api/admin/openapi': ['./src/app/api/**/*.ts'],
  },
  async headers() {
    // Content-Security-Policy is set per-request in middleware.ts (needs a
    // fresh nonce each time, so it can't live in this static config).
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@/lib/supabase/admin': false,
      };
    }
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // No auth token in CI/local builds -> source maps just won't be uploaded,
  // the build itself still succeeds.
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
});