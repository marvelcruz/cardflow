// CardFlow WhatsApp Business Platform webhook for Vercel.
// Set WHATSAPP_VERIFY_TOKEN in Vercel before configuring Meta.

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).send('Method not allowed');
  }

  // Meta expects a fast 200 response. For now this endpoint receives and logs
  // incoming WhatsApp payloads. The next production step is persisting parsed
  // supplier rates in a shared database so all visitors see updates instantly.
  const body = req.body || {};

  try {
    const changes = body?.entry?.flatMap(e => e.changes || []) || [];
    const messages = changes.flatMap(c => c?.value?.messages || []);
    const incoming = messages.map(m => ({
      from: m.from,
      id: m.id,
      timestamp: m.timestamp,
      type: m.type,
      text: m?.text?.body || null,
    }));

    console.log('CardFlow WhatsApp webhook', JSON.stringify(incoming));
  } catch (error) {
    console.error('CardFlow webhook parse error', error);
  }

  return res.status(200).json({ received: true });
}
