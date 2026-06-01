import 'dotenv/config';
import { initApp } from './app.js';
import { getEmailConfigStatus, verifyEmailConnection } from './emailService.js';

const PORT = Number(process.env.PORT) || 3002;
initApp()
  .then(async (app) => {
    app.listen(PORT, () => {
      console.log(`sourcePrice API listening on http://localhost:${PORT}`);

      const email = getEmailConfigStatus();
      if (email.ready) {
        console.log(
          `[email] SMTP configured → ${email.user} via ${email.host} · ${email.routing}`,
        );
        verifyEmailConnection().then((result) => {
          if (result.ok) {
            console.log('[email] SMTP connection verified OK');
          } else {
            console.error(`[email] SMTP verify failed: ${result.error}`);
          }
        });
      } else {
        console.warn(`[email] ${email.reason}`);
      }
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
