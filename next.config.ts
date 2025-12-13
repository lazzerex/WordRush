import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Get base URLs from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || '';
    
    // Extract domains
    const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : '';
    const upstashDomain = upstashUrl ? new URL(upstashUrl).origin : '';

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob: https:;
              font-src 'self' data:;
              connect-src 'self' ${supabaseDomain} ${upstashDomain} ${supabaseDomain.replace('https://', 'wss://')};
            `.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;