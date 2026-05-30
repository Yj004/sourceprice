import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const INLINE_CREDS_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

const resolveCredentialsPath = () => {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  }
  return fileURLToPath(
    new URL('../credentials/google-service-account.json', import.meta.url),
  );
};

const CREDS_PATH = resolveCredentialsPath();

const loadCredentials = () => {
  if (INLINE_CREDS_JSON) {
    return JSON.parse(INLINE_CREDS_JSON);
  }
  if (!existsSync(CREDS_PATH)) {
    throw new Error(
      `Google service account file not found at ${CREDS_PATH}. ` +
        'Save your service account JSON there, or set GOOGLE_SERVICE_ACCOUNT_JSON in .env.',
    );
  }
  return JSON.parse(readFileSync(CREDS_PATH, 'utf8'));
};

let sheetsApi = null;

export const getSheets = () => {
  if (sheetsApi) return sheetsApi;
  if (!SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set in environment.');
  }

  const credentials = loadCredentials();
  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
};

export const getValues = async (range) => {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
    majorDimension: 'ROWS',
  });
  return res.data.values || [];
};

export const appendValues = async (range, rows) => {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
};

export const batchUpdateValues = async (data) => {
  const sheets = getSheets();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });
};

export const getSheetIdByTitle = async (title) => {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === title);
  return sheet?.properties?.sheetId ?? null;
};

export const ensureSheetTab = async (title) => {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
};

export const deleteSheetRows = async (title, startIndex, endIndex) => {
  const sheetId = await getSheetIdByTitle(title);
  if (sheetId == null) return;

  const sheets = getSheets();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex,
            },
          },
        },
      ],
    },
  });
};
