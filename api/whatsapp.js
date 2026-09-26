const { createHmac, timingSafeEqual } = require('node:crypto');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url, 'https://localhost');
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && challenge !== null && process.env.WHATSAPP_VERIFY_TOKEN &&
        safeEqual(token, process.env.WHATSAPP_VERIFY_TOKEN)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send('Method not allowed');
  }
  if (!process.env.META_APP_SECRET) return res.status(503).send('Webhook not configured');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const expected = 'sha256=' + createHmac('sha256', process.env.META_APP_SECRET)
    .update(raw).digest('hex');
  if (!safeEqual(req.headers['x-hub-signature-256'], expected)) {
    return res.status(401).send('Invalid signature');
  }

  let body;
  try { body = JSON.parse(raw.toString('utf8')); }
  catch { return res.status(400).send('Invalid JSON'); }
  if (body.object !== 'whatsapp_business_account') return res.status(404).send('Unknown event');

  // Future processing needs durable storage and idempotency. Do not log
  // customer messages or claim the public rate board has been updated.
  return res.status(200).json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
