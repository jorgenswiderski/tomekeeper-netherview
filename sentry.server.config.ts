// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
