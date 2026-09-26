const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSupplierRates } = require('../lib/supplier-rates');

test('highest supplier rate wins only where accepted amounts overlap', () => {
  const rates = parseSupplierRates(`🌈Bingo rate update(7.53)🌈
*Chime Mail*: 1215/$ 200-3000
*Chime Tag*: 1080/$ 200-3000
*Sephora*: 1185/$ 100-500
🌷update rate（08:00）🌷
*Chime Mail: 1214/$ 50-3000*
*Chime Tag: 1183/$ 50-3000*
*US Gold Razer 1126/$ 25-500*`);
  assert.ok(rates);
  assert.deepEqual(rates.filter(r => r.name === 'Chime Mail').map(({supplier,min,max}) => ({supplier,min,max})), [
    {supplier:1214,min:50,max:199},
    {supplier:1215,min:200,max:3000},
  ]);
  assert.deepEqual(rates.filter(r => r.name === 'Chime Tag').map(({supplier,min,max}) => ({supplier,min,max})), [
    {supplier:1183,min:50,max:3000},
  ]);
  assert.equal(Math.round(1215 * 70) / 100, 850.5);
});

test('ASK never replaces a priced rate and unknown amounts cannot quote', () => {
  const rates = parseSupplierRates(`Bingo rate update
*Chime Mail*: 1215/$ 200-3000
*Chime Mail*: ASK/$ 100-500
*Steam US*: 938/$
*Sephora*: 1185/$ 100-500`);
  assert.ok(rates);
  assert.equal(rates.find(r => r.name === 'Chime Mail' && r.min === 200).supplier, 1215);
  assert.equal(rates.find(r => r.name === 'Steam US').supplier, null);
  assert.equal(rates.find(r => r.name === 'Steam US').min, null);
});
