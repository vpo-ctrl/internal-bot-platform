#!/usr/bin/env node
/**
 * Generate JWT token for voice webhook auth
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const username = process.argv[2] || 'almali';

const token = jwt.sign(
  { username, name: 'Al Mal (VPO)' },
  JWT_SECRET,
  { expiresIn: '90d' } // 90 days for long-running service
);

console.log('\n' + '='.repeat(70));
console.log('JWT TOKEN GENERATED');
console.log('='.repeat(70));
console.log(`\nUser: ${username}`);
console.log(`Expires: 90 days\n`);
console.log(token);
console.log('\n' + '='.repeat(70) + '\n');
console.log('Use this token for voice webhook auth:');
console.log(`export API_AUTH_TOKEN='${token}'\n`);
