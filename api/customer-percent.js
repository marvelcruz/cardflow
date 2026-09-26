const { isAdmin } = require('../lib/admin-auth');
const { configured, saveCustomerPercent } = require('../lib/rates-store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin session expired. Sign in with your PIN again.' });
  if (!configured()) return res.status(503).json({ error: 'Rate database unavailable' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Enter a valid percentage.' }); }
  const percent = Number(body?.customerPercent);
  if (body?.customerPercent === '' || body?.customerPercent == null || !Number.isFinite(percent) || percent < 1 || percent > 100 || Math.round(percent * 100) !== percent * 100) {
    return res.status(400).json({ error: 'Enter a percentage from 1 to 100, with at most two decimal places.' });
  }
  try {
    await saveCustomerPercent(percent);
    return res.status(200).json({ customerPercent: percent });
  } catch { return res.status(503).json({ error: 'Could not save the percentage. Please try again.' }); }
};
