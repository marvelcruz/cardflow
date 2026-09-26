const { configured, readRates } = require('../lib/rates-store');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  if (!configured()) return res.status(503).json({ error: 'Live rates are not configured' });
  try {
    const document = await readRates();
    if (!document) return res.status(200).json({ publishedAt: null, rates: [] });
    const rates = document.rates.map(({ name, category, supplier, min, max }) => ({
      name, category, min, max,
      customerRate: supplier === null ? null : Math.round(supplier * 70) / 100,
    }));
    return res.status(200).json({ publishedAt: document.publishedAt, rates });
  } catch {
    return res.status(503).json({ error: 'Live rates temporarily unavailable' });
  }
};
