// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { CONFIG } from './src/models/config';

if (!CONFIG.IS_DEV) {
    Sentry.init({
        dsn: 'https://90562fd20eaa3dc985c016fceb24bb8b@o4506137251676160.ingest.sentry.io/4506137256919040',

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: 1,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,
    });
}
