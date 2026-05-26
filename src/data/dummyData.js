/**
 * Dummy Data — Phase 3
 * ----------------------------------------------------------------
 * Seed dataset used by `DataContext` while there is no real backend.
 *
 * Shape of every row matches exactly what `services/sheetsService.js`
 * will return when Google Sheets integration lands — so swapping the
 * data source later is a one-line change in DataContext.
 *
 * mainData     → "Products" tab in the future Google Sheet
 * priceHistory → "PriceHistory" tab in the future Google Sheet
 */

export const mainData = [
  { id: 1,  asin: 'B0DX76861K', brand: 'Robustt',    modelNo: 'RB-AC-MOUNT-WHT',    masterCategory: 'AC MOUNT',          currentPrice: 995,  gst: 18, totalUpdates: 1 },
  { id: 2,  asin: 'B0CKLN72MQ', brand: 'Boult',      modelNo: 'BLT-AUDIO-X35',      masterCategory: 'AUDIO',             currentPrice: 1499, gst: 18, totalUpdates: 1 },
  { id: 3,  asin: 'B07HRMBPGJ', brand: 'Boat',       modelNo: 'BT-CHRG-FAST20',     masterCategory: 'CHARGER',           currentPrice: 799,  gst: 18, totalUpdates: 1 },
  { id: 4,  asin: 'B09Q3PJ4LM', brand: 'Portronics', modelNo: 'PT-HUB-USBC-7',      masterCategory: 'HUB',               currentPrice: 2199, gst: 18, totalUpdates: 0 },
  { id: 5,  asin: 'B0BLMK68YH', brand: 'Stuffcool',  modelNo: 'SC-CASE-IP15-CLR',   masterCategory: 'CASE',              currentPrice: 599,  gst: 18, totalUpdates: 0 },
  { id: 6,  asin: 'B0CK19YBZ4', brand: 'Mivi',       modelNo: 'MV-CABLE-USBC-1M',   masterCategory: 'CABLE',             currentPrice: 349,  gst: 18, totalUpdates: 0 },
  { id: 7,  asin: 'B08D9YLNQ7', brand: 'Zebronics',  modelNo: 'ZB-ADAPT-65W',       masterCategory: 'ADAPTER',           currentPrice: 1899, gst: 18, totalUpdates: 0 },
  { id: 8,  asin: 'B07YKBXP2C', brand: 'Ambrane',    modelNo: 'AM-PB-10K-BLK',      masterCategory: 'POWER BANK',        currentPrice: 999,  gst: 18, totalUpdates: 1 },
  { id: 9,  asin: 'B0CXM43L9X', brand: 'URBN',       modelNo: 'UR-CABLE-LTNG-1M',   masterCategory: 'CABLE',             currentPrice: 499,  gst: 18, totalUpdates: 0 },
  { id: 10, asin: 'B0BC9DJG2F', brand: 'Belkin',     modelNo: 'BK-MOUNT-CARDASH',   masterCategory: 'MOUNT',             currentPrice: 1799, gst: 18, totalUpdates: 0 },
  { id: 11, asin: 'B0DT53MX8Q', brand: 'Robustt',    modelNo: 'RB-STAND-LAPTOP-AL', masterCategory: 'STAND',             currentPrice: 1299, gst: 18, totalUpdates: 0 },
  { id: 12, asin: 'B0CXM9YRL5', brand: 'Portronics', modelNo: 'PT-SCRPRO-IP15',     masterCategory: 'SCREEN PROTECTOR',  currentPrice: 299,  gst: 18, totalUpdates: 0 },
  { id: 13, asin: 'B09M76RK4P', brand: 'Boat',       modelNo: 'BT-AUDIO-AIR141',    masterCategory: 'AUDIO',             currentPrice: 1199, gst: 18, totalUpdates: 0 },
  { id: 14, asin: 'B0BCYZJ4HL', brand: 'Boult',      modelNo: 'BLT-CHRG-30W-BLK',   masterCategory: 'CHARGER',           currentPrice: 1099, gst: 18, totalUpdates: 0 },
  { id: 15, asin: 'B07Q4G3VLD', brand: 'Stuffcool',  modelNo: 'SC-CABLE-USBC-2M',   masterCategory: 'CABLE',             currentPrice: 449,  gst: 18, totalUpdates: 0 },
  { id: 16, asin: 'B0DLR5XJP8', brand: 'Mivi',       modelNo: 'MV-AUDIO-DUO5',      masterCategory: 'AUDIO',             currentPrice: 1599, gst: 18, totalUpdates: 0 },
  { id: 17, asin: 'B0CK9PMR2J', brand: 'Robustt',    modelNo: 'RB-ACMNT-DUAL',      masterCategory: 'AC MOUNT',          currentPrice: 1249, gst: 18, totalUpdates: 0 },
  { id: 18, asin: 'B0DCWN4XYZ', brand: 'Ambrane',    modelNo: 'AM-ADAPT-45W',       masterCategory: 'ADAPTER',           currentPrice: 1399, gst: 18, totalUpdates: 0 },
  { id: 19, asin: 'B09JL3FVR1', brand: 'URBN',       modelNo: 'UR-STAND-PHN-AL',    masterCategory: 'STAND',             currentPrice: 699,  gst: 18, totalUpdates: 0 },
  { id: 20, asin: 'B0CW83Q2DT', brand: 'Portronics', modelNo: 'PT-HUB-USB3-4',      masterCategory: 'HUB',               currentPrice: 1499, gst: 18, totalUpdates: 0 },
];

export const priceHistory = [
  { id: 'seed-1', asin: 'B0DX76861K', oldPrice: 950,  newPrice: 995,  updatedBy: 'admin@gmail.com', timestamp: '2026-05-26 10:30 AM', updateNumber: 1 },
  { id: 'seed-2', asin: 'B07HRMBPGJ', oldPrice: 850,  newPrice: 799,  updatedBy: 'admin@gmail.com', timestamp: '2026-05-25 03:12 PM', updateNumber: 1 },
  { id: 'seed-3', asin: 'B0CKLN72MQ', oldPrice: 1399, newPrice: 1499, updatedBy: 'admin@gmail.com', timestamp: '2026-05-25 11:45 AM', updateNumber: 1 },
  { id: 'seed-4', asin: 'B07YKBXP2C', oldPrice: 1099, newPrice: 999,  updatedBy: 'admin@gmail.com', timestamp: '2026-05-24 09:20 AM', updateNumber: 1 },
];
