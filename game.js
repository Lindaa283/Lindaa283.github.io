/* ============================================================
   BACK LINDA — a founder simulator
   ============================================================ */
'use strict';

const QUARTERS = 8;
const TOKENS = 3;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- tiny sound engine (off by default) ---------- */
const Snd = {
  on: false, ctx: null,
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  blip(freq = 420, dur = 0.06, type = 'square', vol = 0.035) {
    if (!this.on) return;
    this.init();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  ok() { this.blip(540, .05); setTimeout(() => this.blip(760, .07), 55); },
  bad() { this.blip(180, .14, 'sawtooth', .03); },
  tick() { this.blip(880, .025, 'square', .022); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, .12, 'triangle', .04), i * 95)); },
};

/* ---------- the five things she can spend a quarter on ---------- */
const TRACKS = [
  { k: 'lab',    name: 'LAB',    sub: 'the bench',  hint: 'Chips, assays, papers. Slow, compounding credibility.' },
  { k: 'shop',   name: 'SHOP',   sub: 'the store',  hint: 'The AI store. Cash now, costs energy.' },
  { k: 'build',  name: 'BUILD',  sub: 'ship it',    hint: 'Bots, tools, repos. Momentum and credibility.' },
  { k: 'market', name: 'MARKET', sub: 'compound',   hint: 'Move cash into positions. Capital compounds.' },
  { k: 'rest',   name: 'REST',   sub: 'log off',    hint: 'Sleep, friends, GTA. Buys back energy.' },
];

/* ---------- events: drawn from her real trajectory ---------- */
const EVENTS = [
  {
    tag: 'Q1 · THE MOVE', title: 'The flight is booked.',
    body: 'An international joint programme means two universities, two grading systems and one visa that does not care about your feelings. You land with a suitcase and a laptop.',
    choices: [
      { t: 'Front-load the coursework. Earn the room to move later.', fx: { cred: 6, energy: -6 }, say: 'Boring first. Interesting later.' },
      { t: 'Open the shop in week one. Cash buys options.', fx: { cash: 14, mom: 8, energy: -8, cred: -2 }, say: 'Rent does not wait for me to settle in.' },
      { t: 'Post the whole thing publicly from day one.', fx: { mom: 16, energy: -4, cred: 1 }, say: "I'm an i-person. Doing it anyway." },
    ],
  },
  {
    tag: 'Q2 · THE LAB', title: 'PEGDA–Dextran, run forty-one.',
    body: 'The phase separation refuses to behave. Your supervisor suggests shelving it. The undergraduate innovation project has your name on it as student lead.',
    choices: [
      { t: 'Run it forty more times and log every one.', fx: { cred: 8, energy: -10 }, say: 'The data does not owe me a result.' },
      { t: 'Write up the negative result honestly and move on.', fx: { cred: 4, mom: 5, energy: -3 }, say: 'A clean null is still a finding.' },
      { t: 'Delegate it. The shop is growing faster.', fx: { cash: 10, cred: -4, energy: -2 }, say: 'Something has to give this month.' },
    ],
  },
  {
    tag: 'Q3 · THE FEED', title: 'A post does 37,000 views.',
    body: 'One video about learning in public outruns everything else you have made. The replies are half founders, half people telling a 21-year-old girl what she should do instead.',
    choices: [
      { t: 'Ride it. Ship something publicly every week.', fx: { mom: 20, energy: -7, cred: 2 }, say: 'Attention is a currency with an expiry date.' },
      { t: 'Convert it. Point the traffic at the shop.', fx: { cash: 18, mom: 6, energy: -5 }, say: 'Views do not pay the Revolut bill.' },
      { t: 'Ignore the noise. Go back into the lab.', fx: { cred: 6, mom: -8, energy: 4 }, say: 'The timeline forgets in a week.' },
    ],
  },
  {
    tag: 'Q4 · iGEM', title: 'The team needs a Human Practices lead.',
    body: 'Synthetic biology, bio-based polyamide PA54, stakeholder interviews, sponsors, outreach. Unpaid. Enormous. The medal is decided in November.',
    choices: [
      { t: 'Take it. Run the whole external programme.', fx: { cred: 10, mom: 8, energy: -12 }, say: 'Gold or nothing. Mostly gold.' },
      { t: 'Contribute, but cap the hours.', fx: { cred: 5, energy: -5 }, say: 'I have learned what burnout costs.' },
      { t: 'Pass. Protect the quarter.', fx: { energy: 10, cred: -3, mom: -4 }, say: 'Saying no is also a strategy.' },
    ],
  },
  {
    tag: 'Q5 · THE MARKET', title: 'Everything is down 19%.',
    body: 'Your positions are red. The group chats are loud. The shop had its best month, which means there is actual cash sitting there asking to be deployed.',
    choices: [
      { t: 'Buy more. The plan did not change.', fx: { capital: 22, cash: -16, energy: -2 }, say: 'This is the part you get paid for.' },
      { t: 'Hold. Add nothing, sell nothing.', fx: { capital: 6, energy: 2 }, say: 'Doing nothing is a position.' },
      { t: 'Sell and put it all into the business.', fx: { cash: 16, capital: -20, mom: 10 }, say: 'I can compound myself faster than the index.' },
    ],
  },
  {
    tag: 'Q6 · THE OFFER', title: 'A pharma group offers an internship.',
    body: 'Real money, real reference, real QC lab. It is also forty hours a week of someone else deciding what you work on, in the exact quarter YC applications open.',
    choices: [
      { t: 'Take the job. Credentials compound too.', fx: { cash: 14, cred: 7, mom: -14, energy: -5 }, say: 'The safe track is not stupid. It is just slow.' },
      { t: 'Decline and write the YC application.', fx: { mom: 20, cred: -2, energy: -6 }, say: 'If I do not apply, the answer is already no.' },
      { t: 'Negotiate part-time. Try to hold both.', fx: { cash: 7, cred: 4, mom: 4, energy: -11 }, say: 'Sleep is the thing I am actually spending.' },
    ],
  },
  {
    tag: 'Q7 · THE READ', title: 'An investor calls you "a great personal brand".',
    body: 'Twenty minutes of a call about your "look" and your "story" and nothing about retention, margin, or the fact that the bot returns a PMID for every claim.',
    choices: [
      { t: 'Send the numbers. Let the spreadsheet talk.', fx: { cred: 8, mom: 6 }, say: 'Price the shell if you want. Read the P&L first.' },
      { t: 'Lean into it. The brand is a real asset.', fx: { mom: 18, cred: -4, cash: 8 }, say: 'Underestimation is a discount. I am buying.' },
      { t: 'End the call. Spend the hour building.', fx: { mom: -6, cred: 4, energy: 6, cash: 4 }, say: 'Not every room is worth being in.' },
    ],
  },
  {
    tag: 'Q8 · THE DEADLINE', title: 'Two forms. One week.',
    body: 'The fully funded PhD application and the YC application close within days of each other. Both want everything. You have one week and whatever energy is left.',
    choices: [
      { t: 'The PhD. Science is the long game.', fx: { cred: 12, mom: -10, energy: -8 }, say: 'I want to be the one who understands it.' },
      { t: 'YC. Build the thing that does not exist yet.', fx: { mom: 24, cash: 6, energy: -8 }, say: 'Not an NPC. Never an NPC.' },
      { t: 'Both, badly, at 4am.', fx: { cred: 6, mom: 11, energy: -17 }, say: 'I will sleep in 2028.' },
    ],
  },
];

/* ---------- endings ---------- */
const ENDINGS = [
  {
    id: 'rockstar', name: 'BOUGHT ROCKSTAR', rank: 'SECRET ENDING · 1 of 6', img: 'img/fig-03.jpg',
    /* A skill gate, not a stat gate: you had to protect her almost perfectly
       for eight quarters AND build everything. Stat thresholds alone can be
       reached by a patient player; letting through three drains cannot. */
    gate: (s) => s.arcade && s.leaks <= 3 && s.capital >= 70 && s.cash >= 55
                 && s.mom >= 70 && s.cred >= 65 && s.energy >= 35,
    mult: 41,
    body: 'It took longer than the tweet implied. The shop became a platform, the platform threw off cash, the cash became positions, and the positions became a holding company with a very silly name. She flies to Vice City for the signing and wears the Teto wig to the board photo on purpose. Somewhere a 21-year-old reads about it and decides she is not an NPC either.',
  },
  {
    /* checked early: running her into the ground overrides every good outcome */
    id: 'burnout', name: 'BURNOUT', rank: 'THE ENDING NOBODY POSTS', img: 'img/fig-04.jpg',
    gate: (s) => s.energy <= 12,
    mult: 0.4,
    body: 'Everything was working. That was the problem — nothing felt safe to drop. The shop goes unanswered for three weeks, the lab notebook stops, and the posting stops first of all. She comes back, because she is 21 and that is what 21 does. But the quarter you lost here was the cheapest thing you could have bought with a REST token.',
  },
  {
    id: 'capitalist', name: 'THE PRETTY CAPITALIST', rank: 'BEST REALISTIC ENDING', img: 'img/fig-03.jpg',
    stat: 'capital',
    mult: 12,
    body: 'She did the unglamorous thing: she kept the boring positions, kept the shop alive, and kept shipping. By 25 the capital pays a salary she never has to ask anyone for. She still does the science, but now she funds it. The costume was never a distraction — it was the part of the interface she controlled.',
  },
  {
    id: 'yc', name: 'ACCEPTED · YC', rank: 'THE LOUD ENDING', img: 'img/fig-02.jpg',
    stat: 'mom',
    mult: 18,
    body: 'The interview is ten minutes long and mostly about retention. She has the number. The batch is full of people who also refused the safe track, and for the first time the room reads her as a founder before anything else. Hard mode: the company now has to actually work.',
  },
  {
    id: 'phd', name: 'FULLY FUNDED · THE LONG GAME', rank: 'THE PATIENT ENDING', img: 'img/fig-01.jpg',
    stat: 'cred',
    mult: 3,
    body: 'Four years, a stipend, and a question nobody has answered yet. Your return is small and arrives late — but she becomes the person who actually understands the pipeline rather than the person selling access to it. The shop ticks over in the background. Some of the best companies start the year the thesis is submitted.',
  },
  {
    id: 'operator', name: 'THE OPERATOR', rank: 'THE QUIET ENDING', img: 'img/fig-04.jpg',
    stat: 'cash',
    mult: 6,
    body: 'No batch, no lab coat, no headline. Just a store that works, a handful of tools people pay for, and an income that does not depend on anyone hiring her. It is the least cinematic ending on this list and the one that buys the most freedom per hour.',
  },
  {
    id: 'npc', name: 'NPC', rank: 'THE DEFAULT ENDING', img: 'img/fig-01.jpg',
    fallback: true,
    mult: 1,
    body: 'Graduation, a good job, a reasonable salary, someone else deciding the roadmap. Nothing went wrong. That is the whole point: the default outcome is not a disaster, it is just the default — and it arrives automatically if nobody spends a quarter on anything else.',
  },
];

/* ============================================================
   state
   ============================================================ */
const S = {
  q: 0, cheque: 25, equity: 12,
  cash: 20, cred: 25, mom: 20, energy: 70, capital: 5,
  alloc: {}, log: [],
};
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ============================================================
   screens
   ============================================================ */
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('is-on', s.id === id));
  window.scrollTo(0, 0);
}

/* ============================================================
   title
   ============================================================ */
$$('.stake').forEach((b) => b.addEventListener('click', () => {
  $$('.stake').forEach((x) => { x.classList.remove('is-on'); x.setAttribute('aria-checked', 'false'); });
  b.classList.add('is-on'); b.setAttribute('aria-checked', 'true');
  S.cheque = +b.dataset.cheque; S.equity = +b.dataset.equity;
  Snd.tick();
}));

$('#btnSound').addEventListener('click', (e) => {
  Snd.on = !Snd.on;
  e.currentTarget.textContent = '♪ sound: ' + (Snd.on ? 'on' : 'off');
  e.currentTarget.setAttribute('aria-pressed', String(Snd.on));
  if (Snd.on) { Snd.init(); Snd.ok(); }
});

$('#btnStart').addEventListener('click', () => {
  Object.assign(S, {
    q: 0, cash: 20 + S.cheque * 0.4, cred: 25, mom: 20, energy: 70, capital: 5, log: [],
    leaks: 0, arcade: false, drainCost: 0,
  });
  S.cash = clamp(S.cash);
  $('#logList').innerHTML = '';
  pushLog(`Signed: €${S.cheque}k for ${S.equity}%. Good luck.`, 'hi');
  Snd.ok();
  show('s-game');
  nextQuarter();
});

/* ============================================================
   the loop
   ============================================================ */
function nextQuarter() {
  if (S.q >= QUARTERS) return finish();
  const ev = EVENTS[S.q];
  $('#hQ').textContent = `${S.q + 1} / ${QUARTERS}`;
  paintMeters();

  $('#allocCard').hidden = true;
  $('#roundCard').hidden = true;
  const card = $('#eventCard');
  card.hidden = false;
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  $('#evTag').textContent = ev.tag;
  $('#evTitle').textContent = ev.title;
  $('#evBody').textContent = ev.body;

  const box = $('#choices');
  box.innerHTML = '';
  ev.choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.innerHTML = `<i>${String.fromCharCode(65 + i)}</i><span>${c.t}</span>`;
    b.addEventListener('click', () => pickChoice(c, ev));
    box.appendChild(b);
  });
}

function pickChoice(c, ev) {
  Snd.ok();
  apply(c.fx);
  say(c.say);
  pushLog(`${ev.tag.split('·')[0].trim()} — ${c.t}`);
  logDelta(c.fx);
  $('#eventCard').hidden = true;
  reduceMotion ? openAlloc() : openRound();
}

/* Each quarter's round is tuned to the quarter it belongs to, so the eight
   rounds do not feel like the same twenty seconds eight times. */
const ROUND_FLAVOUR = [
  { bias: { lab: 1.4, rest: 1.2 }, hazard: 0.12, speed: 0.9 },           // Q1 settling in
  { bias: { lab: 2.0 }, hazard: 0.16 },                                   // Q2 the lab
  { bias: { build: 2.0, shop: 1.4 }, hazard: 0.15, speed: 1.05 },         // Q3 it goes viral
  { bias: { lab: 1.6, build: 1.3 }, hazard: 0.2 },                        // Q4 iGEM eats the quarter
  { bias: { market: 2.4 }, hazard: 0.24, speed: 1.1 },                    // Q5 the drawdown
  { bias: { shop: 1.6, rest: 0.9 }, hazard: 0.18, speed: 1.1 },           // Q6 the job offer
  { bias: { build: 1.6, market: 1.3 }, hazard: 0.18, speed: 1.15 },       // Q7 the read
  /* deadline week is the hardest round, but it must not be an automatic loss:
     keep the speed, ease the hazard rate and leave rest on the table */
  { bias: { build: 1.5, lab: 1.5, rest: 1.1 }, hazard: 0.19, speed: 1.3 },
];

/* ============================================================
   the arcade round — replaces the token UI when motion is allowed
   ============================================================ */
function openRound() {
  const card = $('#roundCard');
  card.hidden = false;
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  $('#rNo').textContent = S.q + 1;
  $('#roundStart').hidden = false;
  $('#haul').innerHTML = '';
  $('#rCombo').textContent = '';
  $('#rTime').textContent = '20.0';

  $('#btnSkip').onclick = () => { Snd.tick(); card.hidden = true; openAlloc(); };
  $('#btnGo').onclick = async () => {
    Snd.ok();
    $('#roundStart').hidden = true;
    const res = await Arcade.run($('#arena'), {
      duration: 20000,
      portrait: $('#portrait'),
      /* live stats so the character rig can react: the aura takes the colour of
         whatever she is strongest in, and she visibly degrades when exhausted */
      stats: () => ({ energy: S.energy, cred: S.cred, mom: S.mom, cash: S.cash, capital: S.capital }),
      ...(ROUND_FLAVOUR[S.q] || {}),
      onTick: ({ left, combo }) => {
        $('#rTime').textContent = (left / 1000).toFixed(1);
        $('#rCombo').textContent = combo >= 2 ? `${combo}× combo` : '';
      },
    });
    finishRound(res);
  };
}

function finishRound(res) {
  /* an orb is worth a third of a token, so a strong round ≈ the old 3 tokens */
  /* Normalise the haul instead of passing raw counts through: the mix you
     caught sets the direction, skill sets the magnitude inside a bounded range.
     Without this, combo multipliers inflate a round well past the 3-token
     economy the endings are balanced against. */
  const raw = TRACKS.map((t) => Math.max(0, res.got[t.k] || 0));
  const sum = raw.reduce((a, b) => a + b, 0);
  const total = Math.min(3.2, 0.9 + sum * 0.085);
  S.alloc = {};
  TRACKS.forEach((t, i) => (S.alloc[t.k] = sum ? (raw[i] / sum) * total : 0));
  /* every drain that reached her is a straight energy cost, applied here so it
     reads as one number instead of hiding inside a negative REST allocation */
  S.drainCost = res.drained * 2;
  S.leaks += res.drained;
  S.arcade = true;  // only the ones that got past the shield

  const haul = $('#haul');
  haul.innerHTML = TRACKS
    .filter((t) => res.got[t.k] > 0)
    .map((t) => `<span style="--c:${Arcade.TYPES[t.k].c}"><b>${t.name}</b> ${res.got[t.k].toFixed(1)}</span>`)
    .join('') + `<span class="haul-meta">best combo ${res.best}× · ${res.caught} caught · ${res.blocked} blocked · ${res.drained} got through</span>`;

  pushLog(`Quarter played — ${res.caught} caught, ${res.blocked} blocked, ${res.drained} got through, best ${res.best}×`, 'hi');
  if (res.drained >= 3) say('Too much got through. That one hurt.');
  else if (res.best >= 6) say('That is the rhythm. Keep it.');

  Snd.win();
  setTimeout(() => { $('#roundCard').hidden = true; resolveQuarter(); }, 1500);
}

function openAlloc() {
  S.alloc = {};
  TRACKS.forEach((t) => (S.alloc[t.k] = 0));
  const wrap = $('#tracks');
  wrap.innerHTML = '';
  TRACKS.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'track';
    row.innerHTML = `
      <div class="t-head"><b>${t.name}</b><span>${t.sub}</span></div>
      <p class="t-hint">${t.hint}</p>
      <div class="t-ctl">
        <button type="button" class="t-btn" data-d="-1" aria-label="less ${t.name}">−</button>
        <div class="pips" aria-hidden="true">${'<i></i>'.repeat(TOKENS)}</div>
        <button type="button" class="t-btn" data-d="1" aria-label="more ${t.name}">+</button>
      </div>`;
    row.querySelectorAll('.t-btn').forEach((b) => b.addEventListener('click', () => {
      const d = +b.dataset.d;
      const used = Object.values(S.alloc).reduce((a, x) => a + x, 0);
      if (d > 0 && used >= TOKENS) return Snd.bad();
      if (d < 0 && S.alloc[t.k] <= 0) return Snd.bad();
      S.alloc[t.k] += d;
      Snd.tick();
      paintAlloc();
    }));
    wrap.appendChild(row);
  });
  const card = $('#allocCard');
  card.hidden = false;
  card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  paintAlloc();
}

function paintAlloc() {
  const used = Object.values(S.alloc).reduce((a, x) => a + x, 0);
  $('#tokLeft').textContent = TOKENS - used;
  $('#btnRun').disabled = used !== TOKENS;
  $$('#tracks .track').forEach((row, i) => {
    const n = S.alloc[TRACKS[i].k];
    row.classList.toggle('has', n > 0);
    row.querySelectorAll('.pips i').forEach((p, j) => p.classList.toggle('on', j < n));
  });
}

$('#btnRun').addEventListener('click', () => { $('#allocCard').hidden = true; resolveQuarter(); });

/* Both routes into a quarter — the arcade round and the manual token UI —
   fill S.alloc and then land here, so the balance tables stay the one source. */
function resolveQuarter() {
  const a = S.alloc;
  const fx = { cash: 0, cred: 0, mom: 0, energy: -2 - (S.drainCost || 0), capital: 0 };
  S.drainCost = 0;

  fx.cred += a.lab * 7;      fx.energy -= a.lab * 3;
  fx.cash += a.shop * 11 * (1 + S.mom / 200); fx.energy -= a.shop * 4;
  fx.mom += a.build * 8;     fx.cred += a.build * 2; fx.energy -= a.build * 3;
  const moved = Math.min(S.cash * 0.75, a.market * 12);
  fx.capital += moved * 1.05; fx.cash -= moved;
  fx.energy += a.rest * 26;  fx.mom -= a.rest * 2;

  // capital compounds, momentum decays, low energy taxes everything
  fx.capital += S.capital * 0.09;
  fx.mom -= 2;
  if (S.energy < 30) { fx.cred -= 4; fx.cash -= 3; }

  apply(fx);
  logDelta(fx, true);
  Snd.ok();

  if (S.energy <= 12) {
    pushLog('Energy critical. She is running on nothing.', 'bad');
    say('I can keep going. …Can I keep going?');
    Snd.bad();
  }

  S.q++;
  setTimeout(nextQuarter, reduceMotion ? 0 : 420);
}

/* ============================================================
   stats, portrait, log
   ============================================================ */
function apply(fx) {
  Object.entries(fx).forEach(([k, v]) => { if (k in S) S[k] = clamp(S[k] + v); });
  paintMeters();
  paintPortrait();
}

const _lastMeter = {};
function paintMeters() {
  $$('.meter').forEach((m) => {
    const k = m.dataset.k, v = S[k];
    if (_lastMeter[k] !== undefined && _lastMeter[k] !== v && !reduceMotion) {
      m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump');
    }
    _lastMeter[k] = v;
    m.querySelector('i').style.width = v + '%';
    m.querySelector('b').textContent = k === 'cash' || k === 'capital' ? '€' + v + 'k' : v;
    m.classList.toggle('low', v <= 20);
    m.classList.toggle('high', v >= 75);
  });
  const worth = Math.round((S.cash + S.capital + S.cred * 0.6 + S.mom * 0.8) * S.equity / 10);
  $('#hEq').textContent = '€' + worth + 'k';
}

function paintPortrait() {
  const img = $('#portrait'), mood = $('#charMood');
  let src = 'img/fig-01.jpg', m = 'FOCUSED';
  if (S.energy <= 25) { src = 'img/fig-04.jpg'; m = 'RUNNING ON FUMES'; }
  else if (S.capital >= 45) { src = 'img/fig-03.jpg'; m = 'PLAYING THE LONG GAME'; }
  else if (S.mom >= 55) { src = 'img/fig-02.jpg'; m = 'ON A RUN'; }
  else if (S.cred >= 55) { src = 'img/fig-01.jpg'; m = 'IN THE LAB'; }
  if (!img.src.endsWith(src)) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = src; img.style.opacity = '1'; }, reduceMotion ? 0 : 200);
  }
  mood.textContent = m;
}

let sayTimer;
function say(text) {
  const el = $('#speech');
  el.hidden = false;
  el.querySelector('p').textContent = '“' + text + '”';
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { el.hidden = true; }, 6500);
}

function pushLog(text, cls = '') {
  const li = document.createElement('li');
  if (cls) li.className = cls;
  li.textContent = text;
  $('#logList').prepend(li);
}

function logDelta(fx, quiet) {
  const names = { cash: 'cash', cred: 'cred', mom: 'momentum', energy: 'energy', capital: 'capital' };
  const parts = Object.entries(fx)
    .filter(([, v]) => Math.abs(v) >= 1)
    .map(([k, v]) => `${v > 0 ? '+' : ''}${Math.round(v)} ${names[k] || k}`);
  if (parts.length) pushLog((quiet ? '· ' : '→ ') + parts.join('  '), 'delta');
}

/* ============================================================
   ending
   ============================================================ */
const SEEN_KEY = 'backlinda.seen';
const getSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; } };

/* Which ending? A hard gate first (burnout, and the secret one), otherwise
   whichever stat she ended up highest in — so the HUD bars tell you, while you
   play, which ending you are steering towards. */
function resolveEnding(s) {
  const gated = ENDINGS.find((e) => e.gate && e.gate(s));
  if (gated) return gated;
  const scored = ENDINGS.filter((e) => e.stat);
  let best = null;
  scored.forEach((e) => { if (!best || s[e.stat] > s[best.stat]) best = e; });
  if (!best || s[best.stat] < 35) return ENDINGS.find((e) => e.fallback);
  return best;
}

function finish() {
  const e = resolveEnding(S);
  const invested = S.cheque;
  const out = Math.round(invested * e.mult);

  $('#endRank').textContent = e.rank;
  $('#endTitle').textContent = e.name;
  $('#endImg').src = e.img;
  $('#endBody').textContent = e.body;
  $('#endStats').innerHTML = `
    <div><span>YOU PUT IN</span><b>€${invested}k</b></div>
    <div><span>YOU GET BACK</span><b class="hl">€${out}k</b></div>
    <div><span>MULTIPLE</span><b>${e.mult}×</b></div>
    <div><span>SHE ENDS AT</span><b>${S.cred} cred · ${S.mom} mom · ${S.energy} energy</b></div>
    ${S.arcade ? `<div><span>GOT PAST YOU</span><b>${S.leaks} drain${S.leaks === 1 ? '' : 's'}</b></div>` : ''}`;

  const seen = getSeen();
  if (!seen.includes(e.id)) { seen.push(e.id); try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {} }
  $('#seenList').innerHTML = ENDINGS.map((x) =>
    `<span class="${seen.includes(x.id) ? 'got' : ''}">${seen.includes(x.id) ? x.name : '???'}</span>`).join('');

  const share = `I backed Linda with €${invested}k and got ${e.name} — ${e.mult}× \n\nBACK LINDA, a founder sim: https://lindaa283.github.io/game.html`;
  $('#btnCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(share); $('#btnCopy').textContent = 'COPIED ✓'; }
    catch { $('#btnCopy').textContent = 'PRESS ⌘/CTRL+C'; }
    setTimeout(() => ($('#btnCopy').textContent = 'COPY RESULT'), 2200);
  };
  $('#btnX').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(share);

  e.mult >= 6 ? Snd.win() : Snd.bad();
  show('s-end');
}

$('#btnAgain').addEventListener('click', () => { Snd.tick(); show('s-title'); });

/* keyboard: A/B/C to choose, 1-5 to allocate, Enter to run */
document.addEventListener('keydown', (ev) => {
  if (!$('#s-game').classList.contains('is-on')) return;
  const k = ev.key.toLowerCase();
  if (!$('#eventCard').hidden) {
    const i = 'abc'.indexOf(k);
    if (i > -1) $$('#choices .choice')[i]?.click();
  } else if (!$('#allocCard').hidden) {
    const i = '12345'.indexOf(k);
    if (i > -1) $$('#tracks .track')[i]?.querySelector('[data-d="1"]')?.click();
    if (k === 'enter' && !$('#btnRun').disabled) $('#btnRun').click();
    if (k === 'backspace') { ev.preventDefault(); $$('#tracks .track').forEach((r) => r.querySelector('[data-d="-1"]').click()); }
  }
});
