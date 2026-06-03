/**
 * Test SMTP setup — run: npm run test:email
 */
import 'dotenv/config';
import {
  getEmailConfigStatus,
  getRecipientsForBrand,
  sendCtcAlertIfNeeded,
  verifyEmailConnection,
} from '../emailService.js';

const status = getEmailConfigStatus();
console.log('Email config:', status);

if (!status.ready) {
  console.error('\nFix your .env first. You need SMTP_HOST, SMTP_USER, SMTP_PASS.');
  process.exit(1);
}

const verify = await verifyEmailConnection();
if (!verify.ok) {
  console.error('\nSMTP login failed:', verify.error);
  process.exit(1);
}

const testBrand = process.argv[2] || 'Robustt';
const recipients = getRecipientsForBrand(testBrand);
console.log(`\nBrand "${testBrand}" → ${recipients.emails.join(', ')}\n`);

console.log('SMTP connection OK. Sending test alert...\n');

const result = await sendCtcAlertIfNeeded({
  product: {
    asin: 'B0TEST12345',
    brand: testBrand,
    modelNo: 'RB-TEST-MODEL',
    packSize: '1',
  },
  changes: [
    {
      key: 'categoryTeamCost',
      label: 'CATAGORY TEAM COST',
      oldValue: 0,
      newValue: 995,
    },
  ],
  updatedBy: 'test@avaipl.com',
  timestamp: new Date().toLocaleString('en-IN'),
});

if (result.ok) {
  console.log(`Test email sent to ${result.to.join(', ')}`);
} else {
  console.error('Send failed:', result);
  process.exit(1);
}
