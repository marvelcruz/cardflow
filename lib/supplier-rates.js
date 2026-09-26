const HEADER = /\b(?:bingo\s*rate\s*update|rate\s*update|update\s*rate|rate\s*list)\b/i;
const SECTION = /【([^】]+)】/;
const PRICE = /^(.*?)(ASK|\d+(?:\.\d+)?)\s*\/\s*(?:\$|\*)(.*)$/i;
const RANGE = /^(\d+(?:\.\d+)?)(k)?\s*(?:-\s*(\d+(?:\.\d+)?)(k)?|\+)?/i;

function updateCount(text) {
  return typeof text === 'string' ? text.split(/\r?\n/).filter(line => HEADER.test(line)).length : 0;
}
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
  if (/us apple horizontal/i.test(n)) return 'US Apple Horizontal';
  if (/other apple|other itunes/i.test(n)) return 'Apple';
  if (/us itunes/i.test(n)) return 'US Apple';
  if (/x-?box/i.test(n)) return 'Xbox';
  if (/gift card|remaining|spend|transfer/i.test(n)) return '';
  return n;
}
function nameFor(label, section) {
  let name = clean(label);
  if (!name) name = section;
  else if (/^(us|uk|eu|eur|ca|cad|au|aud|nz|nzd|ch|chf|sg|pn|malay|singapore|brazil)$/i.test(name) && section) name += ' ' + section;
  else if (/^us green/i.test(name) && /razer/i.test(section)) name += ' Razer Gold';
  return name.replace(/\biTunes\b/ig, 'Apple').replace(/\bGold\s+Razer\b/ig, 'Razer Gold').replace(/\bX-box\b/ig, 'Xbox').replace(/\bCAD\b/ig, 'CA').replace(/\bAUD\b/ig, 'AU').replace(/\bEUR\b/ig, 'EU').replace(/\bCHF\b/ig, 'CH').replace(/\bNZD\b/ig, 'NZ');
}
function bestRates(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const result = [];
  for (const group of groups.values()) {
    const known = group.filter(r => r.min !== null);
    const boundaries = [...new Set(known.flatMap(r => [r.min, r.max === null ? Infinity : r.max + 1]))].sort((a,b)=>a-b);
    if (!boundaries.length) { result.push(group[0]); continue; }
    const bands = [];
    for (let i=0; i<boundaries.length-1; i++) {
      const min = boundaries[i], max = boundaries[i+1] === Infinity ? null : boundaries[i+1]-1;
      const candidates = known.filter(r => r.min <= min && (r.max === null || r.max >= min));
      if (!candidates.length) continue;
      const winner = candidates.reduce((a,b) => (b.supplier ?? -1) > (a.supplier ?? -1) ? b : a);
      const prior = bands[bands.length-1];
      if (prior && prior.supplier === winner.supplier && prior.max !== null && prior.max+1 === min) prior.max = max;
      else bands.push({ ...winner, min, max });
    }
    result.push(...bands);
  }
  return result;
}
function parseSupplierRates(text) {
  if (typeof text !== 'string' || text.length > 32000 || !HEADER.test(text) || updateCount(text) > 8) return null;
  let section = '', pending = '';
  const rows = [];
  for (const input of text.split(/\r?\n/)) {
    const raw = input.trim();
    if (!raw) continue;
    const heading = raw.match(SECTION);
    if (heading) { section = sectionName(heading[1]); pending = ''; continue; }
    if (HEADER.test(raw) || /price is subject|please do not|past two weeks|if you have any questions|10min use all|remaining|confirm the face value/i.test(raw)) continue;
    const line = raw.replace(/[：﹕]/g, ':').replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/^[*\s]+|[*\s]+$/g, '').trim();
    const match = line.match(PRICE);
    if (!match) {
      if (!/\d\s*\/\s*\$/.test(line) && /^[*\p{L}\s/]+$/u.test(line) && line.length < 90 && !/^(all the above|if you|pls|the |once )/i.test(line)) pending = clean(line);
      continue;
    }
    const name = nameFor(match[1] || pending, section);
    if (match[1].trim()) pending = '';
    const range = match[3].trim().match(RANGE);
    const min = range ? Number(range[1]) * (range[2] ? 1000 : 1) : null;
    const max = range?.[3] ? Number(range[3]) * (range[4] ? 1000 : 1) : null;
    // Without an accepted amount, show ASK rather than an unverified numeric quote.
    const supplier = range && match[2].toUpperCase() !== 'ASK' ? Number(match[2]) : null;
    if (!name || name.length > 80 || /[^\p{L}\p{N}\s&/'().-]/u.test(name) ||
        (supplier !== null && (!Number.isFinite(supplier) || supplier < 1 || supplier > 100000)) ||
        (min !== null && (!Number.isFinite(min) || min <= 0 || min > 100000 || max !== null && max < min))) continue;
    rows.push({ name, category: category(name), supplier, min, max });
  }
  const rates = bestRates(rows);
  return rates.length >= 3 && rates.length <= 300 ? rates : null;
}
module.exports = { parseSupplierRates, updateCount };
