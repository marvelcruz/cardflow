const { createHmac, timingSafeEqual, randomBytes } = require('node:crypto');

const COOKIE = 'cardflow_admin';
const LIFETIME = 12 * 60 * 60;
function secret() { return process.env.CARDFLOW_PUBLISH_TOKEN; }
function adminPin() {
  if (!secret()) return null;
  const digest = createHmac('sha256', secret()).update('cardflow-admin-pin-v1').digest();
  return (digest.readBigUInt64BE(0) % 10000000000n).toString().padStart(10, '0');
}
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function signature(payload) { return createHmac('sha256', secret()).update(payload).digest('hex'); }
function makeCookie() {
  const payload = `v1.${Math.floor(Date.now()/1000)+LIFETIME}.${randomBytes(16).toString('hex')}`;
  return `${COOKIE}=${payload}.${signature(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${LIFETIME}`;
}
function isAdmin(req) {
  if (!secret()) return false;
  const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  const match = /^v1\.(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value || '');
  if (!match || Number(match[1]) <= Date.now()/1000) return false;
  const payload = `v1.${match[1]}.${match[2]}`;
  return equal(match[3], signature(payload));
}
const clearCookie = `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;
module.exports = { adminPin, equal, makeCookie, isAdmin, clearCookie };
