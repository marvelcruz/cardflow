const { randomUUID, timingSafeEqual } = require('node:crypto');
const { parseSupplierRates } = require('../lib/supplier-rates');
const { configured, publishRates } = require('../lib/rates-store');

function sameSecret(provided, expected) {
  if (typeof provided !== 'string' || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  if (!sameSecret(token, process.env.CARDFLOW_PUBLISH_TOKEN)) {
    return res.status(401).json({ error: 'Incorrect publish key' });
  }
  if (!configured()) return res.status(503).json({ error: 'Rate database unavailable' });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
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
