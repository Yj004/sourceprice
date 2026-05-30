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
    console.error('Failed to initialize users sheet:', e);
    process.exit(1);
  });
