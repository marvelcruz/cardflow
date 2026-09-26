const KEY = 'cardflow:published-rates:v1';
const SEEN = 'cardflow:seen-messages:v1';
const SCRIPT = `
  if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 1 then return 0 end
  local old = redis.call('GET', KEYS[1])
  if old then
    local previous = cjson.decode(old)
    if tonumber(previous.messageTimestamp or 0) > tonumber(ARGV[2]) then return -1 end
  end
  redis.call('SET', KEYS[1], ARGV[3])
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
  redis.call('EXPIRE', KEYS[2], 2592000)
  return 1
`;
function configured() { return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN); }
async function command(parts) {
  if (!configured()) throw new Error('Rate store not configured');
  const url = process.env.KV_REST_API_URL.replace(/\/$/, '');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Rate store unavailable');
  const result = await response.json();
  if (result.error) throw new Error('Rate store rejected command');
  return result.result;
}
async function readRates() {
  const raw = await command(['GET', KEY]);
  return raw ? JSON.parse(raw) : null;
}
async function publishRates(messageId, timestamp, rates) {
  const publishedAt = new Date().toISOString();
  const document = { publishedAt, messageTimestamp: timestamp, rates };
  return command(['EVAL', SCRIPT, '2', KEY, SEEN, messageId, String(timestamp), JSON.stringify(document)]);
}
module.exports = { configured, command, readRates, publishRates };
