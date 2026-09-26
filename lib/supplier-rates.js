const MAX_RATES = 150;
const MIN_RATES = 3;
const VALID_HEADER = /\b(?:rate\s*(?:update|list)|bingo\s*rate)\b/i;
const SECTION = /【([^】]+)】/;
const VALUE = /^(.*?)\s*:?[\s*]*(ASK|\d+(?:\.\d+)?)\s*\/\s*\$\s*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?)|\+)?\s*\*?\s*$/i;

function clean(value) {
  return value.replace(/\([^)]*\)/g, ' ').replace(/[\*⭕🏀‼️=:【】]/gu, ' ').replace(/\s+/g, ' ').trim();
}
function category(name) {
  const n = name.toLowerCase();
  if (/apple|itunes/.test(n)) return 'Apple';
  if (/steam/.test(n)) return 'Steam';
  if (/razer/.test(n)) return 'Razer';
  if (/xbox/.test(n)) return 'Xbox';
  if (/psn|playstation/.test(n)) return 'PSN';
  if (/sephora|macy|footlocker|nordstrom|lululemon|gamestop|doordash|nike|target|uber|adidas|best buy|home depot|eneba/.test(n)) return 'Gift Card';
  return 'Other';
}
function sectionName(raw) {
  const n = clean(raw);
  if (/gold razer/i.test(n)) return 'Razer Gold';
  if (/psn|playstation/i.test(n)) return 'PSN';
  if (/other apple/i.test(n)) return 'Apple';
  return n;
}
function parseSupplierRates(text) {
  if (typeof text !== 'string' || text.length > 16000 || !VALID_HEADER.test(text)) return null;
  let section = '';
  let malformed = 0;
  const rates = [];
  for (const input of text.split(/\r?\n/)) {
    const raw = input.trim();
    if (!raw) continue;
    const heading = raw.match(SECTION);
    if (heading) { section = sectionName(heading[1]); continue; }
    if (/price is subject|please do not|past two weeks|if you have any questions|spend|rate update/i.test(raw)) continue;
    const line = raw.replace(/：/g, ':').replace(/\u00a0/g, ' ');
    if (!/\b(?:ASK|\d+(?:\.\d+)?)\s*\/\s*\$/i.test(line)) {
      if (/\/\s*\$\s*\d/i.test(line)) malformed++;
      continue;
    }
    const match = line.match(VALUE);
    if (!match) { malformed++; continue; }
    let name = clean(match[1]);
    if (section && /^(us|uk|eu|ca|au|nz|ch|sg|pn)$/i.test(name)) name += ' ' + section;
    if (section && /^us green/i.test(name)) name += ' ' + section;
    const supplier = /^ask$/i.test(match[2]) ? null : Number(match[2]);
    const min = Number(match[3]);
    const max = match[4] ? Number(match[4]) : null;
    if (!name || name.length > 80 || /[^\p{L}\p{N}\s&/'().-]/u.test(name) ||
        (supplier !== null && (!Number.isFinite(supplier) || supplier < 1 || supplier > 100000)) ||
        !Number.isFinite(min) || min <= 0 || min > 100000 || (max !== null && max < min)) {
      malformed++; continue;
    }
    rates.push({ name, category: category(name), supplier, min, max });
  }
  // An incomplete or ambiguous message must never replace the published board.
  const identities = new Set(rates.map(r => r.name.toLowerCase() + ':' + r.min + ':' + r.max));
  if (malformed || rates.length < MIN_RATES || rates.length > MAX_RATES || identities.size !== rates.length) return null;
  return rates;
}
module.exports = { parseSupplierRates };
