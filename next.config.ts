import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strip source maps from production — browser DevTools can't show original source
  productionBrowserSourceMaps: false,

  // Remove X-Powered-By: Next.js header — hides the framework
  poweredByHeader: false,

  // Security + anti-fingerprinting headers on every response
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent framing (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Stop MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No referrer leakage to external sites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Block browser features not needed by the app
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Basic XSS protection for older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      // No caching of API responses — prevents response inspection via cache
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },

  // Rewrite API paths to non-descriptive names — hides what each endpoint does
  async rewrites() {
    return [
      { source: "/api/v1/create",   destination: "/api/generate" },
      { source: "/api/v1/pay",      destination: "/api/payment/initiate" },
      { source: "/api/v1/confirm",  destination: "/api/payment/verify" },
      { source: "/api/v1/hook",     destination: "/api/payment/notify" },
      { source: "/api/v1/usage",    destination: "/api/trials/status" },
    ];
  },
};

export default nextConfig;
