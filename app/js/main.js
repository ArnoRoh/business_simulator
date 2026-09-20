import { START, apply } from './engine.js';

const STORAGE_KEY = 'asha-stall-v2';
const $ = id => document.getElementById(id);
const els = { progress: $('progress'), scene: $('scene'), hud: $('hud'), card: $('card'), mini: $('mini') };

let game=null, state={...START}, dayIdx=0, beatIdx=0, rushScore=0, reflectText='', trajectory='', evidenceNote='', evidenceKind='', funnelSrc='';

function captureSrc(){
  try{
    const u = new URL(location.href);
    const src = (u.searchParams.get('src')||'').trim().slice(0,40).replace(/[^a-zA-Z0-9._-]/g,'');
    if(src){ funnelSrc = src; localStorage.setItem('asha-src', src); }
    else { funnelSrc = localStorage.getItem('asha-src')||''; }
  }catch{ funnelSrc = localStorage.getItem('asha-src')||''; }
}
captureSrc();

function loadGame(){ return fetch('./content/game.json').then(r=>r.json()); }
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({state, dayIdx, beatIdx, reflectText, trajectory, evidenceNote, evidenceKind, funnelSrc, at:Date.now()}));
}
function loadSave(){
  try{
    const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(s && s.state) { state=s.state; dayIdx=s.dayIdx||0; beatIdx=s.beatIdx||0; reflectText=s.reflectText||''; trajectory=s.trajectory||''; evidenceNote=s.evidenceNote||''; evidenceKind=s.evidenceKind||''; funnelSrc=s.funnelSrc||localStorage.getItem('asha-src')||''; return true; }
  }catch{}
  return false;
}
function clearSave(){ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('asha-src'); }

// Scene: warm market SVG, changes by day
function renderScene(){
  const day = dayIdx+1;
  const time = ['dawn','morning','noon','afternoon','sunset'][Math.min(4,dayIdx)];
  const colors = {dawn:'#ffe9c2', morning:'#fff6ea', noon:'#fff', afternoon:'#fff6ea', sunset:'#ffd9a0'};
  const sky = colors[time];
  const stallColor = day>3 ? '#ff7a18' : '#0f766e';
  const crowd = Math.min(6, Math.max(1, Math.round(state.reputation/16)));
  const svg = `
  <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img">
    <rect width="400" height="260" rx="22" fill="${sky}"/>
    <circle cx="340" cy="40" r="18" fill="#facc15" opacity=".9"/>
    <g opacity=".15">
      <ellipse cx="70" cy="48" rx="30" ry="12" fill="#fff"/>
      <ellipse cx="120" cy="38" rx="24" ry="9" fill="#fff"/>
    </g>
    <!-- stall -->
    <rect x="90" y="120" width="220" height="90" rx="14" fill="#fff" stroke="#f0ddbd" stroke-width="2"/>
    <rect x="80" y="110" width="240" height="22" rx="8" fill="${stallColor}"/>
    <rect x="90" y="132" width="220" height="6" rx="3" fill="#1a140e" opacity=".08"/>
    <!-- mandazi stacks -->
    <g>
      <ellipse cx="150" cy="175" rx="28" ry="10" fill="#fde9c7"/>
      <circle cx="140" cy="168" r="10" fill="#facc15" stroke="#e6a20a" stroke-width="1.5"/>
      <circle cx="158" cy="165" r="11" fill="#fdba74" stroke="#d97706" stroke-width="1.5"/>
      <circle cx="150" cy="154" r="9" fill="#ffedd5" stroke="#fdba74" stroke-width="1.5"/>
    </g>
    <g>
      <ellipse cx="250" cy="175" rx="28" ry="10" fill="#fde9c7"/>
      <circle cx="240" cy="168" r="10" fill="#facc15" stroke="#e6a20a" stroke-width="1.5"/>
      <circle cx="260" cy="165" r="11" fill="#fdba74" stroke="#d97706" stroke-width="1.5"/>
    </g>
    <!-- Asha -->
    <g>
      <circle cx="200" cy="108" r="16" fill="#a67c52"/>
      <path d="M186 122 Q200 132 214 122 L210 105 L190 105 Z" fill="${stallColor}"/>
      <circle cx="194" cy="107" r="1.5" fill="#1a140e"/><circle cx="206" cy="107" r="1.5" fill="#1a140e"/>
      <path d="M196 114 Q200 118 204 114" stroke="#1a140e" fill="none" stroke-width="1.3" stroke-linecap="round"/>
    </g>
    <!-- customers -->
    <g>
      ${Array.from({length:crowd},(_,i)=>{
        const x = 30 + i*52 + (i%2?6:0);
        const y = 210 - (i%3?0:8);
        return `<g>
          <circle cx="${x}" cy="${y-12}" r="9" fill="#c9a88a"/>
          <rect x="${x-10}" y="${y}" width="20" height="14" rx="6" fill="#fff6ea" stroke="#f0ddbd"/>
          <circle cx="${x-2}" cy="${y-14}" r="1.2" fill="#1a140e"/><circle cx="${x+4}" cy="${y-14}" r="1.2" fill="#1a140e"/>
        </g>`;
      }).join('')}
    </g>
    <!-- cash tin -->
    <g>
      <rect x="310" y="160" width="36" height="28" rx="6" fill="#1a140e"/>
      <rect x="314" y="164" width="28" height="4" rx="2" fill="#facc15" opacity=".9"/>
      <text x="328" y="184" text-anchor="middle" font-size="8" fill="#fff" font-weight="800">TIN</text>
    </g>
  </svg>`;
  els.scene.innerHTML = svg;
  renderHud();
}
function renderHud(){
  const cash = Math.round(state.cash);
  const tier = cash < 15000 ? 'warn' : '';
  els.hud.innerHTML = `
    <div class="hud-pill cash">💰 TZS ${cash.toLocaleString('en-TZ')}</div>
    <div class="hud-pill ${state.reputation<40?'warn':''}">${state.reputation<40?'⚠️':'⭐'} ${state.reputation}</div>
  `;
}
function renderProgress(){
  const totalDays = game.days.length;
  const html = game.days.map((d,i)=>{
    const done = i < dayIdx;
    const active = i === dayIdx;
    const pct = done ? 100 : active ? ((beatIdx)/d.beats.length)*100 : 0;
    return `<div style="flex:1">
      <div class="dot ${done?'done':''}"><div class="dot-fill" style="width:${pct}%"></div></div>
      <div class="dot-label" style="${active?'color:var(--ink);font-weight:800':''}">${d.label.split('—')[0].trim()}</div>
    </div>`;
  }).join('');
  els.progress.innerHTML = `<div style="display:flex; gap:8px; width:100%">${html}</div>`;
}

function currentBeat(){ return game.days[dayIdx]?.beats[beatIdx]; }
function currentDay(){ return game.days[dayIdx]; }

function showResult(title, body, effects, nextLabel='Continue →'){
  state = apply(state, effects);
  save(); renderScene(); renderHud();
  els.mini.innerHTML='';
  els.card.innerHTML = `
    <div class="result">
      <div class="result-emoji">${effects && (effects.cash||0)>=0 ? '✨' : '💡'}</div>
      <div class="result-title">${title}</div>
      <p class="result-body">${body}</p>
      <button class="primary" id="next-btn">${nextLabel}</button>
    </div>`;
  $('next-btn').onclick = advance;
}
function advance(){
  beatIdx++;
  if(beatIdx >= currentDay().beats.length){
    // day complete interstitial
    if(dayIdx >= game.days.length-1){
      renderEnd();
      return;
    }
    renderDayComplete();
    return;
  }
  save(); render();
}
function renderDayComplete(){
  save(); renderScene(); renderProgress();
  const nextDay = game.days[dayIdx+1];
  els.card.innerHTML = `
    <div class="day-complete">
      <h3>Day ${dayIdx+1} done ✅</h3>
      <p>You kept the stall running. Tomorrow is ${nextDay.label.split('—')[1]||'next'}.</p>
      <button class="primary" id="go-next">Start ${nextDay.label.split('—')[0].trim()} →</button>
      <button class="ghost" id="take-break" style="margin-top:10px; background:rgba(255,255,255,.15); color:#fff; border-color:rgba(255,255,255,.3)">Take a break — continue later</button>
    </div>`;
  els.mini.innerHTML='';
  $('go-next').onclick = ()=>{ dayIdx++; beatIdx=0; save(); render(); };
  $('take-break').onclick = ()=>{ els.card.innerHTML=`<div class="card"><div class="title">Paused 🌙</div><p class="body">Your stall is saved on this phone. Come back tomorrow — progress stays.</p><button class="primary" id="resume">Resume</button></div>`; $('resume').onclick=()=>{ dayIdx++; beatIdx=0; save(); render(); }; };
}

function renderSlider(beat){
  const start = beat.start;
  els.mini.innerHTML='';
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
    <div class="slider-wrap">
      <div class="slider-row">
        <span style="font-weight:800">TZS ${beat.min}</span>
        <input id="price-slider" class="slider" type="range" min="${beat.min}" max="${beat.max}" step="${beat.step}" value="${start}">
        <span style="font-weight:800">TZS ${beat.max}</span>
      </div>
      <div class="crowd" id="crowd"></div>
      <div class="tin"><div><div class="tin-label">If you sell today</div><div style="font-size:12px; opacity:.8">Crowd × margin</div></div><div class="tin-value" id="tin-val">—</div></div>
    </div>
    <div class="choices" id="quick-choices" style="margin-top:12px"></div>
  `;
  const slider = $('price-slider');
  const crowdEl = $('crowd');
  const tinEl = $('tin-val');
  const quick = $('quick-choices');

  // quick tap choices mirror slider
  beat.options.forEach(o=>{
    const b=document.createElement('button'); b.className='choice'; b.innerHTML=`<div class="choice-icon">${o.icon}</div><div class="choice-text"><div class="choice-title">${o.label}</div><div class="choice-sub">${o.sub}</div></div><div class="choice-arrow">›</div>`;
    b.onclick=()=>{
      slider.value = o.id==='cheap'?beat.min : o.id==='mid'?Math.round((beat.min+beat.max)/2):beat.max;
      update();
      showResult(o.label, o.id==='mid'?'Customers felt it was fair and you kept more per sale. Nice.':'You tried it — see how crowd and tin move together.', o.effects);
    };
    quick.appendChild(b);
  });

  function update(){
    const price = Number(slider.value);
    const demand = Math.max(1, 7 - Math.round((price-beat.min)/beat.step));
    crowdEl.innerHTML = Array.from({length:demand},()=>`<div class="crowd-person" style="height:${18+Math.random()*18}px; opacity:${.7+Math.random()*.3}"></div>`).join('');
    const margin = price - beat.unitCost;
    tinEl.textContent = `TZS ${(demand*margin*22).toLocaleString('en-TZ')}`;
  }
  slider.addEventListener('input', update);
  update();

  // also allow drag confirm
  const confirm=document.createElement('button'); confirm.className='primary'; confirm.style.marginTop='10px'; confirm.textContent='Keep this price →';
  confirm.onclick=()=>{
    const p=Number(slider.value);
    const mid=(beat.min+beat.max)/2;
    let opt = beat.options[1];
    if(p < mid - 40) opt = beat.options[0]; else if(p > mid+40) opt = beat.options[2];
    showResult(opt.label, 'Price sets both crowd and what you keep. You felt that.', opt.effects);
  };
  els.card.appendChild(confirm);
}

function renderRush(beat){
  let time = beat.time;
  rushScore=0;
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
    <div class="mini-card">
      <div style="display:flex; justify-content:space-between; align-items:center">
        <div class="mini-title" style="margin:0">Tap customers ✨</div>
        <div class="hud-pill" style="pointer-events:auto">⏱ <span id="rush-timer">${time}s</span> · <span id="rush-score">0</span></div>
      </div>
      <div id="rush-grid" class="tap-grid" style="margin-top:10px"></div>
    </div>
  `;
  els.mini.innerHTML='';
  const grid=$('rush-grid');
  const timerEl=$('rush-timer'), scoreEl=$('rush-score');
  let iv;
  function spawn(){
    grid.innerHTML='';
    for(let i=0;i<6;i++){
      const c=document.createElement('button'); c.className='tap-customer'; c.innerHTML=`<div style="font-size:22px">🧑🏾</div><div style="font-size:12px; font-weight:700">Serve</div>`;
      c.onclick=()=>{ if(c.classList.contains('served')) return; c.classList.add('served'); c.innerHTML='✅ Served'; rushScore++; scoreEl.textContent=rushScore; };
      grid.appendChild(c);
    }
  }
  spawn();
  iv=setInterval(()=>{
    time--; timerEl.textContent=time+'s';
    if(time<=5) timerEl.parentElement.classList.add('warn');
    if(time<=0){ clearInterval(iv);
      const win = rushScore>=6;
      showResult(win?"Rush handled!":"You did what you could", win?"You chose who to serve — that's the real skill when you can't serve everyone.":"A rush always leaves someone waiting. Tomorrow, price or stock can ease it.", win?beat.effectsWin:beat.effectsLose, win?"Nice →":"Continue →");
    }
    if(time%4===0) spawn();
  },1000);
}

function renderShelf(beat){
  let level = 2;
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
    <div class="slider-wrap">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <span class="kicker" style="margin:0">Shelf</span>
        <span id="shelf-cash" class="hud-pill" style="pointer-events:auto">Cash impact —</span>
      </div>
      <div id="shelf" class="shelf"></div>
      <div style="display:flex; gap:8px; margin-top:10px">
        <button class="ghost" id="shelf-less">− Less</button>
        <button class="primary" id="shelf-more" style="flex:1">+ More</button>
      </div>
    </div>
  `;
  els.mini.innerHTML='';
  function refresh(){
    const s=$('shelf'); s.innerHTML='';
    for(let i=0;i<level;i++){ const d=document.createElement('div'); d.className='shelf-item'; d.textContent='📦'; s.appendChild(d); }
    if(level===0) s.innerHTML='<span style="color:var(--muted); font-size:13px; padding:6px">Empty — you\'ll turn people away</span>';
    const eff = beat.effects[level]||beat.effects[2];
    $('shelf-cash').textContent = (eff.cash>=0?'+':'')+ eff.cash.toLocaleString('en-TZ') + ' · stock '+eff.stock;
    if(level===2) $('shelf-cash').style.background='#ecfdf5';
  }
  $('shelf-more').onclick=()=>{ level=Math.min(3,level+1); refresh(); };
  $('shelf-less').onclick=()=>{ level=Math.max(0,level-1); refresh(); };
  refresh();
  const confirm=document.createElement('button'); confirm.className='primary'; confirm.style.marginTop='10px'; confirm.textContent='Stock it →';
  confirm.onclick=()=>{
    const eff=beat.effects[level];
    const msg = level===2?'Just enough — cash still free and shelf not empty.': level>2?'Full shelf feels safe but cash is parked there.': level===0?'Empty shelf costs you sales.':'';
    showResult(['Light shelf','Balanced','Just right','Stocked up'][level]||'Stocked', msg||'You chose where cash sits.', eff);
  };
  els.card.appendChild(confirm);
}

function renderHire(beat){
  let picked=null;
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
  `;
  els.mini.innerHTML = `<div class="mini-card"><div class="swipe-row" id="hire-row"></div><button class="primary" id="hire-confirm" disabled style="margin-top:12px">Pick one →</button></div>`;
  const row=$('hire-row');
  beat.options.forEach(o=>{
    const c=document.createElement('div'); c.className='hire-card'; c.innerHTML=`<div class="hire-ava">${o.icon}</div><div class="hire-name">${o.label}</div><div class="hire-trait">${o.sub}</div>`;
    c.onclick=()=>{
      picked=o; [...row.children].forEach(x=>x.classList.remove('selected')); c.classList.add('selected');
      $('hire-confirm').disabled=false;
    };
    row.appendChild(c);
  });
  $('hire-confirm').onclick=()=>{
    if(!picked) return;
    showResult(picked.label, picked.id==='mama'?'Reliable beats cheap when customers remember you.':'You made a trade-off — every hire is one.', picked.effects);
  };
}

function renderChoice(beat){
  els.mini.innerHTML='';
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
    <div class="choices" id="choices"></div>
  `;
  const box=$('choices');
  beat.options.forEach(o=>{
    const b=document.createElement('button'); b.className='choice'; b.innerHTML=`<div class="choice-icon">${o.icon}</div><div class="choice-text"><div class="choice-title">${o.label}</div><div class="choice-sub">${o.sub}</div></div><div class="choice-arrow">›</div>`;
    b.onclick=()=>{
      // Track 0 trajectory is a choice the system never assigns — store it
      if(beat.id==='d2_track'){ trajectory=o.id; save(); }
      showResult(o.label, 'You acted and saw what moved. That\'s the lesson — not the “right” answer.', o.effects);
    };
    box.appendChild(b);
  });
}

function renderEvidence(beat){
  els.mini.innerHTML='';
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
    <div class="choices" id="evidence-choices"></div>
    <div id="evidence-form" style="margin-top:12px; display:none">
      <textarea id="evidence-text" placeholder="Write your offer: e.g. '30 mandazi to Shop X at 500, paid on delivery, Fri 2pm'" rows="3" style="width:100%; border:1.5px solid var(--line); border-radius:16px; padding:12px; font:inherit; resize:none"></textarea>
      <p style="font-size:12px; color:var(--muted); margin:6px 0">No photo is uploaded — this stays on your phone until you choose to share. 200KB max if you add a photo later.</p>
      <button class="primary" id="evidence-save" disabled>Save & continue →</button>
      <button class="ghost" id="evidence-skip" style="margin-top:8px">Skip — I'll do it later</button>
    </div>
    <p style="font-size:12px; color:var(--muted); margin-top:10px">This is teaching by doing, not a test. One artefact before the grant gate.</p>
  `;
  const box=$('evidence-choices');
  const form=$('evidence-form');
  beat.options.forEach(o=>{
    const b=document.createElement('button'); b.className='choice'; b.innerHTML=`<div class="choice-icon">${o.icon}</div><div class="choice-text"><div class="choice-title">${o.label}</div><div class="choice-sub">${o.sub}</div></div><div class="choice-arrow">›</div>`;
    b.onclick=()=>{
      evidenceKind=o.id;
      [...box.children].forEach(x=>x.classList.remove('selected')); b.classList.add('selected');
      form.style.display='block';
      if(o.id==='photo'){
        $('evidence-text').placeholder='Describe your cash record: e.g. "Week of 12 May — 45,000 in, 32,000 out, 13,000 left" — or note "photo on phone"';
      } else {
        $('evidence-text').placeholder='Write your offer: e.g. "30 mandazi to Shop X at 500, paid on delivery, Fri 2pm"';
      }
      $('evidence-text').value=evidenceNote;
      $('evidence-save').disabled = evidenceNote.trim().length<4;
    };
    box.appendChild(b);
  });
  const ta=$('evidence-text'), btn=$('evidence-save');
  // restore if already had evidence
  if(evidenceKind){ form.style.display='block'; ta.value=evidenceNote; btn.disabled=evidenceNote.trim().length<4; [...box.children].forEach(c=>{ if(c.textContent.includes(evidenceKind==='photo'?'cash record':'paid-trial')) c.classList.add('selected'); }); }
  ta.addEventListener('input',()=>{ evidenceNote=ta.value; btn.disabled=ta.value.trim().length<4; save(); });
  $('evidence-save').onclick=()=>{ evidenceNote=ta.value; save(); showResult('Saved on this phone','You set a real task — that is the execution signal the grant checks, not a score.', {cash:0, reputation:2}); };
  $('evidence-skip').onclick=()=>{ save(); showResult('Noted','You can still finish — the gate is completion, not this photo. But doing it makes your application stronger.', {cash:0, reputation:0}); };
}

function renderReflect(beat){
  els.mini.innerHTML='';
  els.card.innerHTML = `
    <div class="kicker">${beat.kicker}</div>
    <div class="title">${beat.title}</div>
    <p class="body">${beat.body}</p>
    <textarea id="reflect" placeholder="${beat.prompt}" rows="3" style="width:100%; border:1.5px solid var(--line); border-radius:16px; padding:12px; font:inherit; resize:none"></textarea>
    <p style="font-size:12px; color:var(--muted); margin:8px 0 10px">This unlocks your first grant application. Be honest — one line in Swahili or English is perfect.</p>
    <button class="primary" id="reflect-go" disabled>Save & finish →</button>
    <button class="ghost" id="reflect-skip" style="margin-top:8px">Skip for now</button>
  `;
  const ta=$('reflect'), btn=$('reflect-go');
  ta.value=reflectText;
  ta.addEventListener('input',()=>{ btn.disabled = ta.value.trim().length<4; reflectText=ta.value; save(); });
  btn.disabled = reflectText.trim().length<4;
  $('reflect-go').onclick=()=>{ reflectText=ta.value; save(); renderEnd(); };
  $('reflect-skip').onclick=()=>{ renderEnd(); };
}

function render(){
  renderScene(); renderProgress();
  const b=currentBeat();
  if(!b){ renderDayComplete(); return; }
  if(b.type==='slider') renderSlider(b);
  else if(b.type==='rush') renderRush(b);
  else if(b.type==='shelf') renderShelf(b);
  else if(b.type==='hire') renderHire(b);
  else if(b.type==='evidence') renderEvidence(b);
  else if(b.type==='reflect') renderReflect(b);
  else renderChoice(b);
  window.scrollTo({top:0, behavior:'smooth'});
}

function renderEnd(){
  renderScene(); renderProgress();
  const finalCash = Math.round(state.cash);
  const rep = state.reputation;
  // Completion is the gate — no threshold, no rank. Evidence strengthens the forecast review but never blocks finishing.
  const trajectoryLabel = trajectory==='livelihood' ? 'steady stall' : trajectory==='transform' ? 'growth & export' : 'your path';
  const hint = reflectText ? `You wrote: “${reflectText.slice(0,80)}” — that's the agency signal for the next grant.` : 'You ran 5 days of real decisions — no quiz, just practice.';
  const evidenceHint = evidenceNote ? `Evidence noted: “${evidenceNote.slice(0,60)}”` : 'No evidence note yet — you can still apply; completion is the gate.';
  els.card.innerHTML = `
    <div class="card" style="text-align:center; border-color:var(--accent)">
      <div style="font-size:32px">🎉</div>
      <div class="title" style="text-align:center; margin-top:6px">Stall complete</div>
      <p class="body" style="text-align:center">${hint}</p>
      <p class="body" style="text-align:center; font-size:13px; color:var(--muted)">${evidenceHint}</p>
      <p style="font-size:11px; color:var(--muted)">Path: ${trajectoryLabel} · src: ${funnelSrc||'direct'} · No score — completion only</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0">
        <div class="hud-pill" style="justify-content:center">💰 ${finalCash.toLocaleString('en-TZ')}</div>
        <div class="hud-pill" style="justify-content:center">⭐ ${rep}/100</div>
      </div>
      <button class="primary" id="apply-btn">Apply for 1,000 grant →</button>
      <p style="font-size:12px; color:var(--muted); margin:10px 0 0">The game is the gate. Your application is a short forecast about your real business — the AI checks it blind against what you just did here, not against a perfect score.</p>
      <button class="ghost" id="replay" style="margin-top:10px">Play again</button>
      <button class="ghost" id="share" style="margin-top:8px">Save my record</button>
    </div>
    <div class="card">
      <div class="kicker">Next grant — reflection gate</div>
      <div class="title" style="font-size:17px">Why did it go as it did?</div>
      <p class="body">After 2 months with the first grant, the next unlock asks you to say plainly why things went well or didn't — and what you changed. That story of agency is the filter, not a rank.</p>
      <details style="margin-top:8px"><summary style="font-size:13px; font-weight:700; cursor:pointer">What the portal grades</summary><p style="font-size:12px; color:var(--muted); margin:6px 0">A dated numeric forecast about your own firm + probes generated from your game choices. Blind to game score. Evidence (cash record / trial note) submitted with consent only.</p></details>
    </div>
  `;
  els.mini.innerHTML='';
  $('apply-btn').onclick=()=>{
    // Gate: completion only — store record with trajectory + evidence + funnel for portal (explicit consent, no auto-upload)
    const record = {
      state, reflectText, trajectory, evidence: { kind: evidenceKind, note: evidenceNote },
      funnelSrc, at:new Date().toISOString(), gameId: game.title, version: 'asha-stall-v2', completed: true
    };
    localStorage.setItem('asha-portal-record', JSON.stringify(record));
    // Funnel measurable: count completions locally (for Q-003 validation mock)
    try{
      const c = JSON.parse(localStorage.getItem('asha-funnel')||'{}');
      c.completions = (c.completions||0)+1;
      c.bySrc = c.bySrc||{}; c.bySrc[funnelSrc||'direct']=(c.bySrc[funnelSrc||'direct']||0)+1;
      c.byTrajectory = c.byTrajectory||{}; c.byTrajectory[trajectory||'undecided']=(c.byTrajectory[trajectory||'undecided']||0)+1;
      localStorage.setItem('asha-funnel', JSON.stringify(c));
    }catch{}
    alert('Gate passed — completion recorded. Portal record saved on this phone.\n\nIn deployment this POSTs to /portal (Node) with claim code: AI grades your forecast + this trace blind (no score, no rank). Channel '+ (funnelSrc||'direct') +' noted for bias check.');
  };
  $('replay').onclick=()=>{ clearSave(); state={...START}; dayIdx=0; beatIdx=0; reflectText=''; trajectory=''; evidenceNote=''; evidenceKind=''; render(); };
  $('share').onclick=()=>{
    const blob=new Blob([JSON.stringify({asha:'stall-v2', state, reflectText, trajectory, evidence:{kind:evidenceKind, note:evidenceNote}, funnelSrc, completed:true},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='asha-stall-record.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  };
  window.scrollTo({top:0});
}

// lang stub
$('lang-btn').onclick=()=>{
  const cur=$('lang-btn').textContent;
  $('lang-btn').textContent = cur==='SW'?'EN':'SW';
};

loadGame().then(g=>{
  game=g;
  const hadSave=loadSave();
  if(hadSave && state.day>1) { /* migrated */ }
  render();
});
