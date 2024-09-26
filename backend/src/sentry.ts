import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: 'https://32ce60c9fd2f016f89a6768b31d3ee7b@o4506862653341696.ingest.us.sentry.io/4507986420826112',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.1,
  profilesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === 'production',
});
