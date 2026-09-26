let rates = [];
let trades = read('cardflow_trades', []);
let customerPercent = Number(localStorage.getItem('cardflow_percent') || 70);
let activities = read('cardflow_activity', []);
let adminUnlocked = false;
const supplierWhatsapp = '2348071895503';
let businessWhatsapp = supplierWhatsapp;

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = n => new Intl.NumberFormat('en-NG',{maximumFractionDigits:2}).format(Number(n)||0);
const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const publicRate = r => r.customerRate !== undefined ? r.customerRate : r.supplier == null ? null : r.supplier * (customerPercent/100);
const supplierTotal = (r, amount) => r && r.supplier != null ? r.supplier * Number(amount || 0) : null;
const customerPayout = (r, amount) => r && r.customerRate !== undefined ? r.customerRate * Number(amount || 0) : (()=>{const total=supplierTotal(r,amount);return total==null?null:total*(customerPercent/100)})();
const ownerMargin = (r, amount) => { const total=supplierTotal(r,amount); return total==null ? null : total*(1-customerPercent/100); };
const rangeLabel = r => r.min == null ? 'Confirm amount' : r.max ? `$${fmt(r.min)}–$${fmt(r.max)}` : `$${fmt(r.min)}+`;
const OPEN = new Set(['Checking availability','Available — submit card','Card submitted','Processing','Approved — bank details required','Bank details received']);
function read(k,f){ try { const v=JSON.parse(localStorage.getItem(k)||'null'); return v ?? f; } catch { return f; } }
function save(){ localStorage.setItem('cardflow_trades',JSON.stringify(trades));localStorage.setItem('cardflow_percent',String(customerPercent));localStorage.setItem('cardflow_activity',JSON.stringify(activities.slice(0,50))); }
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
  if (!grid.children.length) grid.innerHTML='<p class="empty-state">No verified rates available yet. Confirm today’s rate with CardFlow before sending a card.</p>';
  $('#publishedCount').textContent=rates.length;$('#askCount').textContent=rates.filter(r=>r.supplier==null).length;
}
function rateForAmount(name,amount){return rates.find(r=>r.name===name && r.min!=null && amount>=r.min && (r.max==null||amount<=r.max));}
function renderTradeOptions(){const prev=$('#tradeCard').value;const names=[...new Set(rates.map(r=>r.name))];$('#tradeCard').innerHTML=names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');if(names.includes(prev))$('#tradeCard').value=prev;}
function renderAdmin(){
  if(document.activeElement!==$('#customerPercent'))$('#customerPercent').value=customerPercent;$('#marginPercent').textContent=fmt(100-customerPercent);$('#customerPercentLabel').textContent=fmt(customerPercent);$('#supplierWhatsapp').value='+'+supplierWhatsapp;$('#businessWhatsapp').value=businessWhatsapp;$('#adminTable').innerHTML=rates.map(r=>`<tr><td>${esc(r.name)}</td><td>${rangeLabel(r)}</td><td class="private">Private on server</td><td class="public">${publicRate(r)==null?'ASK':'₦'+fmt(publicRate(r))+'/$'}</td><td>${publicRate(r)==null?'Needs confirmation':'Published'}</td></tr>`).join('');
  $('#openTradeCount').textContent=trades.filter(t=>OPEN.has(t.status)).length;$('#awaitingPaymentCount').textContent=trades.filter(t=>t.status==='Bank details received').length;renderAdminTrades();
}
function renderActivity(){$('#activityList').innerHTML=(activities.length?activities:[{msg:'No activity yet',time:''}]).slice(0,10).map(a=>`<div class="activity-item"><strong>${esc(a.msg)}</strong><br><small>${esc(a.time)}</small></div>`).join('');}
function renderAdminTrades(){
  const root=$('#adminTrades');if(!trades.length){root.innerHTML='<div class="empty-state">No trades yet.</div>';return;}
  root.innerHTML=trades.map(t=>`<article class="trade-admin-card"><div class="trade-admin-main"><div><span class="trade-id">${esc(t.id)}</span><h4>${esc(t.card)} · $${fmt(t.amount)}</h4><p>Started from WhatsApp</p></div><div class="trade-money">${t.payout?`₦${fmt(t.payout)}`:'ASK'}<small>${esc(t.status)}</small></div></div>${t.supplierValue!=null?`<div class="admin-calc"><span>Supplier total <b>₦${fmt(t.supplierValue)}</b></span><span>Your ${fmt(100-(t.customerPercent??70))}% <b>₦${fmt(t.margin)}</b></span><span>Customer payout <b>₦${fmt(t.payout)}</b></span></div>`:''}${tradeActionHTML(t)}</article>`).join('');
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

async function refreshLiveRates(){
  try {
    const response=await fetch('/api/rates',{cache:'no-store'});
    if(!response.ok)throw new Error('unavailable');
    const data=await response.json();
    if(!Array.isArray(data.rates))throw new Error('invalid');
    if(Number.isFinite(data.customerPercent))customerPercent=data.customerPercent;
    rates=data.rates;
    $('#lastUpdated').textContent=data.publishedAt?'Verified supplier update: '+new Date(data.publishedAt).toLocaleString():'Waiting for verified supplier rates';
    renderRates();renderTradeOptions();renderAdmin();updateQuote();
  }catch{
    rates=[];
    $('#lastUpdated').textContent='Live rates temporarily unavailable';
    renderRates();renderTradeOptions();renderAdmin();updateQuote();
  }
}

function updateQuote(){const amt=Number($('#tradeAmount').value||0),r=rateForAmount($('#tradeCard').value,amt),pr=r?publicRate(r):null,box=$('#quoteBox'),math=$('#quoteMath');const payout=r?customerPayout(r,amt):null;box.querySelector('strong').textContent=payout==null?'ASK':`₦${fmt(payout)}`;box.querySelector('small').textContent=pr==null?'Enter an accepted amount or ask CardFlow to confirm.':`Customer rate: ₦${fmt(pr)}/$`;if(!math)return;if(pr==null||!amt){math.innerHTML='';return;}math.innerHTML=`<span>$${fmt(amt)} × ₦${fmt(pr)}/$</span><b>= ₦${fmt(payout)}</b>`;}
function showView(id){if(id==='admin')openAdmin();$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});}
function createTrade(e){e.preventDefault();const amount=Number($('#tradeAmount').value),r=rateForAmount($('#tradeCard').value,amount);if(!r)return alert('This amount is not listed as accepted. Please ask CardFlow to confirm.');const id='GC-'+Math.random().toString(36).slice(2,7).toUpperCase(),pr=publicRate(r),payout=customerPayout(r,amount),supplierValue=supplierTotal(r,amount),margin=ownerMargin(r,amount);const t={id,card:r.name,amount,rate:pr,payout,supplierValue,margin,customerPercent,status:'Checking availability',created:new Date().toISOString(),cardDetails:null,bank:null};trades.unshift(t);log(`New trade ${id}: ${r.name} $${amount}`);renderAll();const lines=[`Hi, I want to sell a gift card.`,`Trade ID: ${id}`,`Card: ${r.name}`,`Amount: $${fmt(amount)}`,pr==null?`Rate: Please confirm availability`:`Customer rate: ₦${fmt(pr)}/$`,payout==null?`Estimated payout: Pending rate confirmation`:`Estimated payout: ₦${fmt(payout)}`,`Please confirm if this card is available before I send it.`];const url=`https://wa.me/${businessWhatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;window.location.href=url;}
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

function openAdmin(){$('#adminApp').classList.toggle('hidden',!adminUnlocked);$('#adminLock').classList.toggle('hidden',adminUnlocked);}
async function checkAdminSession(){try{const response=await fetch('/api/admin-session',{cache:'no-store',credentials:'same-origin'});const data=await response.json();adminUnlocked=!!data.authenticated;}catch{adminUnlocked=false;}openAdmin();}
$('#adminLoginForm').onsubmit=async e=>{e.preventDefault();const pin=$('#adminPin').value.trim();const button=e.target.querySelector('button');button.disabled=true;try{const response=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin}),credentials:'same-origin',cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not sign in.');adminUnlocked=true;$('#adminPin').value='';openAdmin();}catch(error){alert(error.message);}finally{button.disabled=false;}};
$('#lockAdmin').onclick=async()=>{try{await fetch('/api/admin-session',{method:'POST',credentials:'same-origin'});}finally{adminUnlocked=false;openAdmin();}};

$$('.nav-btn').forEach(b=>b.onclick=()=>showView(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));
$('#search').oninput=renderRates;$('#categoryFilter').onchange=renderRates;$('#tradeCard').onchange=updateQuote;$('#tradeAmount').oninput=updateQuote;$('#tradeForm').onsubmit=createTrade;
$('#trackForm').onsubmit=e=>{e.preventDefault();trackTrade($('#trackId').value);};

$('#savePercent').onclick=async()=>{
  const percent=Number($('#customerPercent').value),report=$('#percentReport'),button=$('#savePercent');
  report.classList.remove('hidden');
  if(!Number.isFinite(percent)||percent<1||percent>100||Math.round(percent*100)!==percent*100){report.className='parse-report error';report.textContent='Enter a percentage from 1 to 100, with at most two decimal places.';return;}
  button.disabled=true;
  try{
    const response=await fetch('/api/customer-percent',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({customerPercent:percent}),cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not save percentage.');
    customerPercent=data.customerPercent;await refreshLiveRates();
    report.className='parse-report ok';report.textContent=`Saved. Customers now receive ${fmt(customerPercent)}% of the supplier rate.`;
  }catch(error){report.className='parse-report error';report.textContent=error.message||'Could not save percentage.';}
  finally{button.disabled=false;}
};

$('#publishRates').onclick=async()=>{
  const button=$('#publishRates'),report=$('#parseReport');
  const message=$('#supplierText').value.trim();
  report.classList.remove('hidden');
  if(!message){report.className='parse-report error';report.textContent='Paste the full supplier rate message.';return;}
  button.disabled=true;button.textContent='Publishing…';
  try{
    const response=await fetch('/api/publish-rates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message}),credentials:'same-origin',cache:'no-store'});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Could not publish rates.');
    report.className='parse-report ok';report.textContent=`Published ${result.published} rates. The shared board is now updated.`;
    await refreshLiveRates();
  }catch(error){report.className='parse-report error';report.textContent=error.message||'Could not publish rates.';}
  finally{button.disabled=false;button.textContent='Publish rates to website';}
};

function refreshWhatsappLink(){const a=$('#whatsappLink');a.href=`https://wa.me/${businessWhatsapp}?text=${encodeURIComponent('Hi, I need help with a gift card trade.')}`;a.onclick=null;}
refreshWhatsappLink();
renderAll();openAdmin();checkAdminSession();refreshLiveRates();setInterval(refreshLiveRates,30000);
