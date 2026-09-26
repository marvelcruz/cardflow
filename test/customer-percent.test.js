const test = require('node:test');
const assert = require('node:assert/strict');

test('shared percentage updates customer rates without exposing supplier rates', async () => {
  process.env.KV_REST_API_URL = 'https://mock.local';
  process.env.KV_REST_API_TOKEN = 'mock';
  const values = new Map([['cardflow:published-rates:v1', JSON.stringify({publishedAt:'today',rates:[{name:'Chime Mail',category:'Other',supplier:1215,min:200,max:3000}]})]]);
  const originalFetch = global.fetch;
  global.fetch = async (_url,{body}) => {
    const [op,key,value] = JSON.parse(body);
    if (op === 'SET') values.set(key,value);
    return {ok:true,json:async()=>({result:op==='GET'?(values.get(key)??null):'OK'})};
  };
  const getRates = require('../api/rates');
  const store = require('../lib/rates-store');
  const res = () => ({setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}});
  try {
    let response = res(); await getRates({method:'GET'},response);
    assert.equal(response.data.customerPercent,70);
    assert.equal(response.data.rates[0].customerRate,850.5);
    await store.saveCustomerPercent(75);
    response = res(); await getRates({method:'GET'},response);
    assert.equal(response.data.customerPercent,75);
    assert.equal(response.data.rates[0].customerRate,911.25);
    assert.equal('supplier' in response.data.rates[0],false);
  } finally { global.fetch = originalFetch; }
});
