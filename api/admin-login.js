const { createHash } = require('node:crypto');
const { adminPin, equal, makeCookie } = require('../lib/admin-auth');
const { configured, command } = require('../lib/rates-store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!adminPin() || !configured()) return res.status(503).json({ error: 'Admin login unavailable' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key = 'cardflow:login-failures:' + createHash('sha256').update(ip).digest('hex');
  try {
    if (Number(await command(['GET', key])) >= 5) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!equal(body?.pin, adminPin())) {
      const attempts = Number(await command(['INCR', key]));
      if (attempts === 1) await command(['EXPIRE', key, '900']);
      return res.status(401).json({ error: 'Incorrect PIN' });
    }
    await command(['DEL', key]);
    res.setHeader('Set-Cookie', makeCookie());
    return res.status(200).json({ authenticated: true });
  } catch { return res.status(503).json({ error: 'Admin login unavailable. Please try again.' }); }
};
