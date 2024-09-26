import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://4f56936350840009c5ad4c557cca15f1@o4506862653341696.ingest.us.sentry.io/4508018030018560',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.001,
  tracePropagationTargets: ['localhost', 'counttoamillion.com'],
  replaysSessionSampleRate: 0.0001,
  replaysOnErrorSampleRate: 0.1,
  enabled: import.meta.env.MODE === 'production',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
