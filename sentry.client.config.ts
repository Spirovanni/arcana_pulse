import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production (or when DSN is set)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1.0,

  // Session replay for debugging UI issues
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Scrub PII before sending events
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    // Scrub sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.data) {
          const data = { ...crumb.data };
          // Remove any bank account numbers, passwords, or tokens
          for (const key of Object.keys(data)) {
            const lower = key.toLowerCase();
            if (
              lower.includes("password") ||
              lower.includes("token") ||
              lower.includes("secret") ||
              lower.includes("account") ||
              lower.includes("routing")
            ) {
              data[key] = "[REDACTED]";
            }
          }
          return { ...crumb, data };
        }
        return crumb;
      });
    }

    return event;
  },
});
