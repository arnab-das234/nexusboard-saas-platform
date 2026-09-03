import type { NextConfig } from "next";

const securityHeaders = [
  // ── OWASP A05: Security Misconfiguration ──────────────────
  {
    key: 'X-Frame-Options',
    value: 'DENY', // Prevent clickjacking
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff', // Prevent MIME sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-XSS-Protection',
    value: '0', // Disabled in favor of CSP (modern browsers)
  },
  // ── HSTS (OWASP A05) ──────────────────────────────────────
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload', // 2 years
  },
  // ── Permissions Policy (OWASP A05) ────────────────────────
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // ── Content Security Policy (OWASP A03) ───────────────────
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https://res.cloudinary.com https://*.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' https://api.razorpay.com https://resend.com https://*.neon.tech`,
      `frame-src https://checkout.razorpay.com`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',

  // Security headers on all responses
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },

  // Disable powered-by header
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },

  // Strict mode for development
  reactStrictMode: process.env.NODE_ENV === 'development',

  // TypeScript: strict in production, relaxed in dev
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
