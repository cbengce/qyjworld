import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

function getSupabaseImagePatterns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    const { hostname, protocol } = new URL(supabaseUrl);
    return [
      {
        protocol: protocol.replace(":", ""),
        hostname,
        pathname: "/storage/v1/object/public/campaigns/**"
      }
    ];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
function createNextConfig(phase) {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    distDir: isDevelopmentServer ? ".next-dev" : ".next",
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    experimental: {
      typedRoutes: false
    },
    images: {
      remotePatterns: getSupabaseImagePatterns()
    },
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Content-Type-Options",
              value: "nosniff"
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin"
            },
            {
              key: "X-Frame-Options",
              value: "SAMEORIGIN"
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()"
            }
          ]
        }
      ];
    }
  };
}

export default createNextConfig;
