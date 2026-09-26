const { createHmac, timingSafeEqual } = require('node:crypto');
const { parseSupplierRates } = require('../lib/supplier-rates');
const { configured, publishRates } = require('../lib/rates-store');

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

  const trusted = new Set((process.env.TRUSTED_SUPPLIER_WA_IDS || '')
    .split(',').map(n => n.replace(/\D/g, '')).filter(Boolean));
  const expectedPhoneId = process.env.META_PHONE_NUMBER_ID;
  if (!trusted.size || !expectedPhoneId) return res.status(200).json({ received: true });

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages' || String(change.value?.metadata?.phone_number_id) !== expectedPhoneId) continue;
        for (const message of change.value?.messages || []) {
          if (message.type !== 'text' || !trusted.has(String(message.from || '').replace(/\D/g, ''))) continue;
          if (!/^[A-Za-z0-9._=:-]{5,300}$/.test(message.id || '')) continue;
          const timestamp = Number(message.timestamp);
          const now = Math.floor(Date.now() / 1000);
          if (!Number.isInteger(timestamp) || timestamp < now - 86400 || timestamp > now + 300) continue;
          const rates = parseSupplierRates(message.text?.body);
          if (!rates) continue;
          if (!configured()) return res.status(503).json({ error: 'Rate store not configured' });
          await publishRates(message.id, timestamp, rates);
        }
      }
    }
  } catch (error) {
    // Return a retryable failure to Meta; never log the incoming message body.
    console.error('CardFlow rate store error', error?.message);
    return res.status(503).json({ error: 'Rate update unavailable' });
  }
  return res.status(200).json({ received: true });
};

module.exports.config = { api: { bodyParser: false } };
