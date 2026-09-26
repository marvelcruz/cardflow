const SAMPLE_MESSAGE = `*🏀🏀Bingo rate update(00.00)🏀🏀*
*The price is subject to change at any time. Please inquire again before issuing the card*
*Chime Mail(30min)*: 1247/$ 200-3000
*Chime Tag(30min)*: 1125/$ 200-3000
*Eneba EU*： 1350/$ 50+
*Sephora*: 1105/$ 100-500
*Moneypak*: 1175/$ 100-500
*Lululemon*: ask/$ 200-500
*Target*: ASK/$ 100-500
⭕*======【Gold Razer】======*⭕
*US* 1165/$ 25-500
*US Green(16code)* 1145/$ 25-500
*SG* 835/$ 25-400
⭕*======【Steam】======⭕*
*US Steam*: 1022/$ 20-500
*EU Steam*: 1155/$ 20-500
*UK Steam*: 1343/$ 20-500
*CA Steam*: 705/$ 20-500
*AU Steam*: 700/$ 20-500
*NZ Steam*: 562/$ 20-500
⭕*======【Xbox】======⭕*
*US*: 1083/$ 20-500
*UK*: 1305/$ 20-500
*EU*: 1035/$ 20-500
⭕*======【Other Apple Fast】======*
*CA Apple*: 775/$ 200-500
*UK Apple*: 1330/$ 150-250
*AU Apple*: 700/$ 300-500
*Japan Apple*: ASK/$ 1-9000
⭕*====【PSN (PlayStation)】====⭕*
*US* 870/$ 10-200
*UK* 840/$ 10-200`;

const DEFAULT_RATES = [
  {name:'Chime Mail',category:'Other',supplier:1247,min:200,max:3000},{name:'Chime Tag',category:'Other',supplier:1125,min:200,max:3000},
  {name:'Eneba EU',category:'Gift Card',supplier:1350,min:50,max:null},{name:'Sephora',category:'Gift Card',supplier:1105,min:100,max:500},
  {name:'Moneypak',category:'Gift Card',supplier:1175,min:100,max:500},{name:'Lululemon',category:'Gift Card',supplier:null,min:200,max:500},
  {name:'Target',category:'Gift Card',supplier:null,min:100,max:500},{name:'US Razer Gold',category:'Razer',supplier:1165,min:25,max:500},
  {name:'US Steam',category:'Steam',supplier:1022,min:20,max:500},{name:'UK Steam',category:'Steam',supplier:1343,min:20,max:500},
  {name:'US Xbox',category:'Xbox',supplier:1083,min:20,max:500},{name:'UK Apple',category:'Apple',supplier:1330,min:150,max:250},
  {name:'US PSN',category:'PSN',supplier:870,min:10,max:200}
];

let rates = read('cardflow_rates', DEFAULT_RATES);
let trades = read('cardflow_trades', []);
let customerPercent = Number(localStorage.getItem('cardflow_percent') || 70);
let activities = read('cardflow_activity', []);
let adminUnlocked = false;
const supplierWhatsapp = '2348071895503';
let businessWhatsapp = supplierWhatsapp;

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = n => new Intl.NumberFormat('en-NG').format(Math.round(Number(n)||0));
const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const publicRate = r => r.supplier == null ? null : r.supplier * (customerPercent/100);
const supplierTotal = (r, amount) => r && r.supplier != null ? r.supplier * Number(amount || 0) : null;
const customerPayout = (r, amount) => { const total=supplierTotal(r,amount); return total==null ? null : total*(customerPercent/100); };
const ownerMargin = (r, amount) => { const total=supplierTotal(r,amount); return total==null ? null : total*(1-customerPercent/100); };
const rangeLabel = r => r.max ? `$${fmt(r.min)}–$${fmt(r.max)}` : `$${fmt(r.min)}+`;
const OPEN = new Set(['Checking availability','Available — submit card','Card submitted','Processing','Approved — bank details required','Bank details received']);
function read(k,f){ try { const v=JSON.parse(localStorage.getItem(k)||'null'); return v ?? f; } catch { return f; } }
function save(){ localStorage.setItem('cardflow_rates',JSON.stringify(rates));localStorage.setItem('cardflow_trades',JSON.stringify(trades));localStorage.setItem('cardflow_percent',String(customerPercent));localStorage.setItem('cardflow_activity',JSON.stringify(activities.slice(0,50))); }
function log(msg){activities.unshift({msg,time:new Date().toLocaleString()});save();renderActivity();}
function nowLabel(){return new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}

function renderRates(){
  const q=$('#search').value.toLowerCase(), cat=$('#categoryFilter').value; const grid=$('#rateGrid'); grid.innerHTML='';
  rates.filter(r=>r.name.toLowerCase().includes(q)&&(cat==='all'||r.category===cat)).forEach(r=>{
    const el=$('#rateCardTemplate').content.cloneNode(true), pr=publicRate(r);
    el.querySelector('.category').textContent=r.category; const st=el.querySelector('.status');st.textContent=pr==null?'ASK':'LIVE';if(pr==null)st.classList.add('ask');
    el.querySelector('h3').textContent=r.name;el.querySelector('.range').textContent=`Accepted: ${rangeLabel(r)}`;el.querySelector('.rate-value').textContent=pr==null?'Check availability':`₦${fmt(pr)}/$`;
    el.querySelector('.trade-btn').onclick=()=>{showView('trade');$('#tradeCard').value=r.name;updateQuote();};grid.appendChild(el);
  });
  $('#publishedCount').textContent=rates.length;$('#askCount').textContent=rates.filter(r=>r.supplier==null).length;
}
function renderTradeOptions(){const prev=$('#tradeCard').value;$('#tradeCard').innerHTML=rates.map(r=>`<option value="${esc(r.name)}">${esc(r.name)} — ${publicRate(r)==null?'ASK':'₦'+fmt(publicRate(r))+'/$'}</option>`).join('');if(rates.some(r=>r.name===prev))$('#tradeCard').value=prev;}
function renderAdmin(){
  $('#customerPercent').value=customerPercent;$('#supplierWhatsapp').value='+'+supplierWhatsapp;$('#businessWhatsapp').value=businessWhatsapp;$('#adminTable').innerHTML=rates.map(r=>`<tr><td>${esc(r.name)}</td><td>${rangeLabel(r)}</td><td class="private">${r.supplier==null?'ASK':'₦'+fmt(r.supplier)+'/$'}</td><td class="public">${publicRate(r)==null?'ASK':'₦'+fmt(publicRate(r))+'/$'}</td><td>${r.supplier==null?'Needs confirmation':'Published'}</td></tr>`).join('');
  $('#openTradeCount').textContent=trades.filter(t=>OPEN.has(t.status)).length;$('#awaitingPaymentCount').textContent=trades.filter(t=>t.status==='Bank details received').length;renderAdminTrades();
}
function renderActivity(){$('#activityList').innerHTML=(activities.length?activities:[{msg:'No activity yet',time:''}]).slice(0,10).map(a=>`<div class="activity-item"><strong>${esc(a.msg)}</strong><br><small>${esc(a.time)}</small></div>`).join('');}
function renderAdminTrades(){
  const root=$('#adminTrades');if(!trades.length){root.innerHTML='<div class="empty-state">No trades yet.</div>';return;}
  root.innerHTML=trades.map(t=>`<article class="trade-admin-card"><div class="trade-admin-main"><div><span class="trade-id">${esc(t.id)}</span><h4>${esc(t.card)} · $${fmt(t.amount)}</h4><p>Started from WhatsApp</p></div><div class="trade-money">${t.payout?`₦${fmt(t.payout)}`:'ASK'}<small>${esc(t.status)}</small></div></div>${t.supplierValue!=null?`<div class="admin-calc"><span>Supplier total <b>₦${fmt(t.supplierValue)}</b></span><span>Your 30% <b>₦${fmt(t.margin)}</b></span><span>Customer payout <b>₦${fmt(t.payout)}</b></span></div>`:''}${tradeActionHTML(t)}</article>`).join('');
  $$('.trade-action').forEach(b=>b.onclick=()=>advanceTrade(b.dataset.id,b.dataset.action));
}
function tradeActionHTML(t){
  const id=esc(t.id), btn=(a,l,c='secondary')=>`<button class="${c} trade-action" data-id="${id}" data-action="${a}">${l}</button>`;
  let actions='';
  if(t.status==='Checking availability') actions=btn('available','Mark available','primary')+btn('unavailable','Unavailable');
  else if(t.status==='Card submitted') actions=btn('processing','Start processing','primary');
  else if(t.status==='Processing') actions=btn('approved','Approve card','primary')+btn('rejected','Reject');
  else if(t.status==='Bank details received') actions=btn('paid','Mark paid','primary');
  return actions?`<div class="trade-actions">${actions}</div>`:'';
}
function renderAll(){renderRates();renderTradeOptions();renderAdmin();renderActivity();updateQuote();save();}

function inferCategory(name){const n=name.toLowerCase();if(n.includes('apple')||n.includes('itunes'))return'Apple';if(n.includes('steam'))return'Steam';if(n.includes('razer'))return'Razer';if(n.includes('xbox'))return'Xbox';if(n.includes('psn')||n.includes('playstation'))return'PSN';if(/sephora|macy|footlocker|nordstrom|lululemon|gamestop|doordash|nike|target|uber|adidas|best buy|home depot|eneba/.test(n))return'Gift Card';return'Other';}
function cleanName(s){return String(s).replace(/\([^)]*\)/g,' ').replace(/[\*⭕🏀‼️=:【】]/g,' ').replace(/\s+/g,' ').trim();}
function normalizeSection(s){const x=cleanName(s);if(/gold razer/i.test(x))return'Razer Gold';if(/psn|playstation/i.test(x))return'PSN';if(/other apple/i.test(x))return'Apple';return x;}
function parseSupplierText(text){
  const out=[];let section='';let lastStandaloneName='';const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(const raw of lines){
    const sec=raw.match(/【([^】]+)】/);if(sec){section=normalizeSection(sec[1]);lastStandaloneName='';continue;}
    if(/price is subject|please do not|past two weeks|if you have any questions|spend|rate update/i.test(raw))continue;
    const line=raw.replace(/：/g,':').replace(/\u00a0/g,' ');
    if(/^\*?[A-Za-z][A-Za-z /&]+\*?$/.test(line)&&!/(ask|\d)/i.test(line)){lastStandaloneName=cleanName(line);continue;}
    const ask=line.match(/^\*?(.+?)\*?\s*:?\s*(?:ASK|ask)\s*\/\$\s*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?)|\+)?/i);
    const numeric=line.match(/^\*?(.+?)\*?\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*\/\$?\s*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?)|\+)?/i);
    const bare=line.match(/^([0-9]+(?:\.[0-9]+)?)\s*\/\$?\s*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?)|\+)?/i);
    if(ask){let name=cleanName(ask[1]);if(section&&/^(us|uk|eu|ca|au|nz|ch|sg|pn)$/i.test(name))name=`${name} ${section}`;if(lastStandaloneName&&name.length<3)name=`${lastStandaloneName} ${name}`;out.push({name,category:inferCategory(name+' '+section),supplier:null,min:Number(ask[2]),max:ask[3]?Number(ask[3]):null});lastStandaloneName='';}
    else if(numeric){let name=cleanName(numeric[1]);if(section&&/^(us|uk|eu|ca|au|nz|ch|sg|pn)$/i.test(name))name=`${name} ${section}`;if(section&&/^us green/i.test(name))name=`${name} ${section}`;out.push({name,category:inferCategory(name+' '+section),supplier:Number(numeric[2]),min:Number(numeric[3]),max:numeric[4]?Number(numeric[4]):null});lastStandaloneName='';}
    else if(bare&&(section||lastStandaloneName)){const name=lastStandaloneName||section;out.push({name,category:inferCategory(name+' '+section),supplier:Number(bare[1]),min:Number(bare[2]),max:bare[3]?Number(bare[3]):null});lastStandaloneName='';}
  }
  const map=new Map();out.filter(x=>x.name&&Number.isFinite(x.min)).forEach(r=>map.set(`${r.name.toLowerCase()}|${r.min}|${r.max??''}`,r));return[...map.values()];
}

function updateQuote(){const r=rates.find(x=>x.name===$('#tradeCard').value),amt=Number($('#tradeAmount').value||0),pr=r?publicRate(r):null,box=$('#quoteBox'),math=$('#quoteMath');const payout=r?customerPayout(r,amt):null;box.querySelector('strong').textContent=payout==null?'ASK':`₦${fmt(payout)}`;box.querySelector('small').textContent=pr==null?'We need to confirm today’s rate first.':`Customer rate: ₦${fmt(pr)}/$`;if(!math)return;if(pr==null||!amt){math.innerHTML='';return;}math.innerHTML=`<span>$${fmt(amt)} × ₦${fmt(pr)}/$</span><b>= ₦${fmt(payout)}</b>`;}
function showView(id){if(id==='admin')openAdmin();$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});}
function createTrade(e){e.preventDefault();const r=rates.find(x=>x.name===$('#tradeCard').value),amount=Number($('#tradeAmount').value);if(!r)return;if(r.min&&amount<r.min)return alert(`Minimum for this card is $${r.min}`);if(r.max&&amount>r.max)return alert(`Maximum for this card is $${r.max}`);const id='GC-'+Math.random().toString(36).slice(2,7).toUpperCase(),pr=publicRate(r),payout=customerPayout(r,amount),supplierValue=supplierTotal(r,amount),margin=ownerMargin(r,amount);const t={id,card:r.name,amount,rate:pr,payout,supplierValue,margin,status:'Checking availability',created:new Date().toISOString(),cardDetails:null,bank:null};trades.unshift(t);log(`New trade ${id}: ${r.name} $${amount}`);renderAll();const lines=[`Hi, I want to sell a gift card.`,`Trade ID: ${id}`,`Card: ${r.name}`,`Amount: $${fmt(amount)}`,pr==null?`Rate: Please confirm availability`:`Customer rate: ₦${fmt(pr)}/$`,payout==null?`Estimated payout: Pending rate confirmation`:`Estimated payout: ₦${fmt(payout)}`,`Please confirm if this card is available before I send it.`];const url=`https://wa.me/${businessWhatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;window.location.href=url;}
function trackTrade(id){const t=trades.find(x=>x.id.toUpperCase()===String(id).trim().toUpperCase()),root=$('#trackResult');root.classList.remove('hidden');if(!t){root.innerHTML='<div class="error-card"><strong>Trade not found.</strong><p>Check the ID and try again.</p></div>';return;}root.innerHTML=tradeCustomerHTML(t);wireCustomerActions(t);}
function tradeCustomerHTML(t){
  const steps=['Checking availability','Available — submit card','Card submitted','Processing','Approved — bank details required','Bank details received','Paid'];let idx=Math.max(0,steps.indexOf(t.status));if(t.status==='Rejected'||t.status==='Unavailable')idx=-1;
  const timeline=steps.map((s,i)=>`<div class="timeline-step ${i<=idx?'done':''}"><span>${i+1}</span><div><strong>${s}</strong></div></div>`).join('');
  let action='';
  if(t.status==='Available — submit card')action=`<form id="cardSubmitForm" class="action-card"><h3>Submit your gift card</h3><label>Card/code or reference<input id="cardCode" placeholder="Enter card code/reference" required /></label><label>Receipt / card image<input id="cardFile" type="file" accept="image/*,.pdf" /></label><label class="check"><input id="ownership" type="checkbox" required /> I confirm I legitimately own this card and the information is accurate.</label><button class="primary">Submit card</button></form>`;
  if(t.status==='Approved — bank details required')action=`<form id="bankForm" class="action-card"><h3>Card approved ✓</h3><p>Enter the account where you want to receive <b>${t.payout?'₦'+fmt(t.payout):'your payout'}</b>.</p><label>Bank name<input id="bankName" required /></label><label>Account number<input id="accountNumber" inputmode="numeric" required /></label><label>Account name<input id="accountName" required /></label><button class="primary">Submit account details</button></form>`;
  return `<div class="track-card"><div class="track-card-head"><div><span class="trade-id">${esc(t.id)}</span><h3>${esc(t.card)} · $${fmt(t.amount)}</h3><p>${t.payout?'Estimated payout: ₦'+fmt(t.payout):'Rate pending confirmation'}</p></div><span class="status-chip">${esc(t.status)}</span></div><div class="timeline">${timeline}</div>${action}</div>`;
}
function wireCustomerActions(t){const cf=$('#cardSubmitForm');if(cf)cf.onsubmit=e=>{e.preventDefault();const f=$('#cardFile').files[0];t.cardDetails={code:$('#cardCode').value.trim(),fileName:f?f.name:null,submittedAt:new Date().toISOString()};t.status='Card submitted';log(`Card submitted for ${t.id}`);renderAll();trackTrade(t.id);};const bf=$('#bankForm');if(bf)bf.onsubmit=e=>{e.preventDefault();t.bank={bankName:$('#bankName').value.trim(),accountNumber:$('#accountNumber').value.trim(),accountName:$('#accountName').value.trim()};t.status='Bank details received';log(`Bank details received for ${t.id}`);renderAll();trackTrade(t.id);};}
function advanceTrade(id,action){const t=trades.find(x=>x.id===id);if(!t)return;const map={available:'Available — submit card',unavailable:'Unavailable',processing:'Processing',approved:'Approved — bank details required',rejected:'Rejected',paid:'Paid'};t.status=map[action]||t.status;log(`${id} → ${t.status}`);renderAll();}

async function hashPin(pin){const data=new TextEncoder().encode(pin);const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function openAdmin(){const has=!!localStorage.getItem('cardflow_admin_hash');$('#adminApp').classList.toggle('hidden',!adminUnlocked);$('#adminLock').classList.toggle('hidden',adminUnlocked);$('#loginTitle').textContent=has?'Admin access':'Create admin PIN';$('#loginHelp').textContent=has?'Enter your admin PIN to continue.':'Choose a PIN for this prototype. You will use it to open the private admin area on this browser.';$('#pinSetupNote').textContent=has?'':'For a live multi-user site, this will be replaced with server-side authentication.';}
$('#adminLoginForm').onsubmit=async e=>{e.preventDefault();const pin=$('#adminPin').value.trim();if(pin.length<4)return;const h=await hashPin(pin),stored=localStorage.getItem('cardflow_admin_hash');if(!stored){localStorage.setItem('cardflow_admin_hash',h);adminUnlocked=true;log('Admin PIN created');}else if(stored===h){adminUnlocked=true;}else{return alert('Incorrect admin PIN.');}$('#adminPin').value='';openAdmin();};
$('#lockAdmin').onclick=()=>{adminUnlocked=false;openAdmin();};

$$('.nav-btn').forEach(b=>b.onclick=()=>showView(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));
$('#search').oninput=renderRates;$('#categoryFilter').onchange=renderRates;$('#tradeCard').onchange=updateQuote;$('#tradeAmount').oninput=updateQuote;$('#tradeForm').onsubmit=createTrade;
$('#trackForm').onsubmit=e=>{e.preventDefault();trackTrade($('#trackId').value);};
$('#customerPercent').onchange=e=>{customerPercent=Math.max(1,Math.min(100,Number(e.target.value)||70));log(`Customer rate rule changed to ${customerPercent}%`);renderAll();};

$('#loadSample').onclick=()=>{$('#supplierText').value=SAMPLE_MESSAGE;};
$('#parseRates').onclick=()=>{const parsed=parseSupplierText($('#supplierText').value);const report=$('#parseReport');report.classList.remove('hidden');if(!parsed.length){report.className='parse-report error';report.textContent='No recognizable rate lines found.';return;}rates=parsed;report.className='parse-report ok';report.textContent=`WhatsApp simulation complete: ${parsed.length} rates updated. ${parsed.filter(r=>r.supplier==null).length} are ASK and still require confirmation.`;$('#lastUpdated').textContent='Updated '+nowLabel();log(`Simulated WhatsApp update: ${parsed.length} rates published`);renderAll();};

function refreshWhatsappLink(){const a=$('#whatsappLink');a.href=`https://wa.me/${businessWhatsapp}?text=${encodeURIComponent('Hi, I need help with a gift card trade.')}`;a.onclick=null;}
refreshWhatsappLink();
renderAll();openAdmin();