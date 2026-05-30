import 'dotenv/config';
import { initApp } from './app.js';

const PORT = Number(process.env.PORT) || 3002;
initApp()
  .then((app) => {
    app.listen(PORT, () => {
      console.log(`sourcePrice API listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Failed to start API server:', e.message || e);
    console.error(
      '\nSetup: place google-service-account.json in sourceprice/credentials/\n' +
        '       (or set GOOGLE_SERVICE_ACCOUNT_JSON in .env). See README.md.\n',
    );
    process.exit(1);
  });
