import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: false,
    chromeWebSecurity: false,   // <-- IMPORTANT: required for Google OAuth popup
    video: false,
    defaultCommandTimeout: 10000,
    env: {
      // Set via: CYPRESS_GOOGLE_TEST_TOKEN=eyJhbG... npx cypress run
      GOOGLE_TEST_TOKEN: '',
    },
  },
});
