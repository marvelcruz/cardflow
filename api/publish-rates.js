const { randomUUID } = require('node:crypto');
const { parseSupplierRates, updateCount } = require('../lib/supplier-rates');
const { configured, publishRates } = require('../lib/rates-store');
const { isAdmin } = require('../lib/admin-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Admin session expired. Sign in with your PIN again.' });
  }
  if (!configured()) return res.status(503).json({ error: 'Rate database unavailable' });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  if (typeof body?.message === 'string' && updateCount(body.message) > 1) return res.status(400).json({ error: 'This paste contains more than one supplier update. Paste only one complete current update at a time. No rates were changed.' });
  const rates = parseSupplierRates(body?.message);
  if (!rates) return res.status(400).json({ error: 'Paste the complete supplier rate list. No rates were changed.' });
  try {
    const result = await publishRates('manual:' + randomUUID(), Math.floor(Date.now() / 1000), rates);
    if (result !== 1) return res.status(409).json({ error: 'A newer rate list was already published. Please try again.' });
    return res.status(200).json({ published: rates.length });
  } catch {
    return res.status(503).json({ error: 'Could not publish rates. Please try again.' });
  }
};
