import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps for better stack traces in Sentry
  widenClientFileUpload: true,

  // Hides source maps from client bundles
  hideSourceMaps: true,

  // Tree-shakes Sentry logger statements for smaller bundles
  disableLogger: true,
});
