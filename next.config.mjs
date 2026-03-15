import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

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
