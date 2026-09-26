const { isAdmin, clearCookie } = require('../lib/admin-auth');
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ authenticated: isAdmin(req) });
  if (req.method === 'POST') {
    res.setHeader('Set-Cookie', clearCookie);
    return res.status(200).json({ authenticated: false });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};
