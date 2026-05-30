import 'dotenv/config';
import { initApp } from '../server/app.js';

let appPromise;

const getApp = () => {
  if (!appPromise) {
    appPromise = initApp();
  }
  return appPromise;
};

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}

