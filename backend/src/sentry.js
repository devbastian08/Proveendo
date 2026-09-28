const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Captura el 100% de las trazas en desarrollo. Baja esto a 0.2 en prod.
    // Set sampling rate for profiling
    profilesSampleRate: 1.0,
  });
}
