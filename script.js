document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- white / black theme ---------- */
const toggle = document.querySelector('.theme-toggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const applyTheme = (dark) => {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  toggle.setAttribute('aria-pressed', String(dark));
  themeMeta.content = dark ? '#0c0612' : '#fff4f8';
};
if (toggle) {
  applyTheme(document.documentElement.dataset.theme === 'dark');
  toggle.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    applyTheme(dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  });
}

const reduceMotion =window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------- looping clips: respect reduced motion, save data off-screen ---------- */
document.querySelectorAll('video[autoplay]').forEach((v) => {
  if (reduceMotion) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; return; }
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.25 }).observe(v);
});

/* ---------- scroll reveal ---------- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 90 + 'ms';
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ---------- typing terminal ---------- */
const typed = document.querySelector('.typed');
if (typed) {
  const lines = typed.dataset.lines.split('|');
  if (reduceMotion) {
    typed.textContent = lines[lines.length - 1];
  } else {
    let li = 0, ci = 0, deleting = false;
    const tick = () => {
      const line = lines[li];
      typed.textContent = line.slice(0, ci);
      if (!deleting && ci < line.length) { ci++; setTimeout(tick, 70); }
      else if (!deleting) { deleting = true; setTimeout(tick, 1600); }
      else if (ci > 0) { ci--; setTimeout(tick, 30); }
      else { deleting = false; li = (li + 1) % lines.length; setTimeout(tick, 300); }
    };
    tick();
  }
}

/* ---------- background sparkles ---------- */
const sparkleLayer = document.querySelector('.sparkles');
const glyphs = ['✦', '✧', '♡', '⋆', '+'];
if (sparkleLayer && !reduceMotion) {
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.fontSize = 8 + Math.random() * 14 + 'px';
    s.style.animationDelay = -Math.random() * 4 + 's';
    s.style.animationDuration = 2.5 + Math.random() * 3 + 's';
    sparkleLayer.appendChild(s);
  }
}

/* stars in the About section */
const stars = document.querySelector('.stars');
if (stars && !reduceMotion) {
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.textContent = i % 4 ? '·' : '✦';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = -Math.random() * 3 + 's';
    stars.appendChild(s);
  }
}

/* ---------- cursor sparkle trail ---------- */
if (finePointer && !reduceMotion) {
  let last = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    const t = document.createElement('span');
    t.className = 'trail';
    t.textContent = Math.random() > 0.5 ? '✦' : '♡';
    t.style.left = e.clientX + 'px';
    t.style.top = e.clientY + 'px';
    t.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px');
    t.style.color = ['#ff4f86', '#c3a8ff', '#5fd8ff', '#ff9ec4'][Math.floor(Math.random() * 4)];
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }, { passive: true });
}

/* ---------- 3D tilt on project cards ---------- */
if (finePointer && !reduceMotion) {
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ---------- count-up numbers ---------- */
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && !reduceMotion) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = +el.dataset.count;
      const start = end > 100 ? end - 40 : 0;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / 1200, 1);
        el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      co.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => co.observe(c));
}

/* ============================================================
   The read — flip cards
   ============================================================ */
(() => {
  const list = document.querySelector('.reads');
  if (!list) return;
  const btns = document.querySelectorAll('.rs-btn');
  const setAll = (face) => {
    list.dataset.face = face;
    list.querySelectorAll('.read-card').forEach((c) => c.classList.toggle('flip', face === 'core'));
    btns.forEach((b) => b.classList.toggle('is-on', b.dataset.face === face));
  };
  btns.forEach((b) => b.addEventListener('click', () => setAll(b.dataset.face)));
  list.querySelectorAll('.read-card > button').forEach((b) => {
    b.addEventListener('click', () => b.parentElement.classList.toggle('flip'));
  });
})();

/* ============================================================
   The ladder — rungs, range, and the portrait that follows
   ============================================================ */
(() => {
  const sec = document.getElementById('ladder');
  if (!sec) return;
  const RUNGS = [
    { tag: 'SELL TIME',      body: 'Hours for money. The price is set by whoever is buying, and it stops the moment you do.', me: 'Everyone starts here. Nobody should stay.' },
    { tag: 'SELL SKILL',     body: 'Still hours, but scarcer ones. Better rate, same ceiling: you are the product and the product sleeps.', me: 'This is the track my degree is pointed at.' },
    { tag: 'SELL A PRODUCT', body: 'Build once, sell many times. The work and the earning come apart for the first time.', me: 'Where I actually am: the shop, the bots, the tools.', here: true },
    { tag: 'OWN ASSETS',     body: 'Equities, equity, a stake in something you did not have to run today. Capital doing the shift you used to work.', me: 'Started here at 20. Small, boring, every month.' },
    { tag: 'OWN THE RULES',  body: 'Not just holding the game pieces — setting what counts as a move. Founders, funds, regulators, the people who write the terms.', me: 'The actual goal. Say it out loud or it never happens.' },
  ];
  const range = sec.querySelector('.ladder-range');
  const btns = [...sec.querySelectorAll('.rung')];
  const figs = [...sec.querySelectorAll('.fig')];
  const badge = sec.querySelector('.fig-rung');
  const el = {
    tag: sec.querySelector('.rp-tag'), body: sec.querySelector('.rp-body'), me: sec.querySelector('.rp-me'),
  };

  const paint = (i) => {
    const r = RUNGS[i];
    el.tag.textContent = r.tag;
    el.body.textContent = r.body;
    el.me.textContent = r.me;
    el.me.classList.toggle('is-here', !!r.here);
    btns.forEach((b, j) => {
      b.classList.toggle('is-on', j === i);
      b.classList.toggle('is-under', j < i);
    });
    badge.textContent = String(i + 1).padStart(2, '0');
    // nearest portrait at or below this rung
    let pick = figs[0];
    figs.forEach((f) => { if (+f.dataset.rung <= i) pick = f; });
    figs.forEach((f) => f.classList.toggle('is-on', f === pick));
    sec.style.setProperty('--rung', i / (RUNGS.length - 1));
  };

  range.addEventListener('input', () => paint(+range.value));
  btns.forEach((b, i) => b.addEventListener('click', () => { range.value = i; paint(i); }));
  paint(+range.value);
})();

/* ============================================================
   The market — compounding chart
   ============================================================ */
(() => {
  const fig = document.querySelector('.compound');
  if (!fig) return;
  const svg = fig.querySelector('.chart');
  const W = 600, H = 260, PAD = { l: 8, r: 8, t: 14, b: 30 };
  const $ = (s) => fig.querySelector(s);
  const money = (n) => '€' + Math.round(n).toLocaleString('en-IE');

  const series = (amt, yrs, rate) => {
    const r = rate / 100 / 12, pts = [];
    let total = 0;
    for (let m = 0; m <= yrs * 12; m++) {
      if (m) total = total * (1 + r) + amt;
      if (m % 3 === 0 || m === yrs * 12) pts.push({ m, paid: amt * m, total });
    }
    return pts;
  };

  const draw = () => {
    const amt = +$('#rAmt').value, yrs = +$('#rYrs').value, rate = +$('#rRate').value;
    $('#cAmt').textContent = amt; $('#cYrs').textContent = yrs; $('#cRate').textContent = rate;
    const pts = series(amt, yrs, rate);
    const maxY = pts[pts.length - 1].total || 1;
    const x = (m) => PAD.l + (m / (yrs * 12)) * (W - PAD.l - PAD.r);
    const y = (v) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
    const path = (key) => pts.map((p, i) => (i ? 'L' : 'M') + x(p.m).toFixed(1) + ' ' + y(p[key]).toFixed(1)).join(' ');
    const lineTotal = path('total');
    svg.querySelector('.line-total').setAttribute('d', lineTotal);
    svg.querySelector('.line-paid').setAttribute('d', path('paid'));
    svg.querySelector('.area').setAttribute('d', lineTotal + ` L${x(yrs * 12).toFixed(1)} ${H - PAD.b} L${PAD.l} ${H - PAD.b} Z`);
    svg.querySelector('.grid-lines').innerHTML = [0.25, 0.5, 0.75, 1]
      .map((f) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(maxY * f).toFixed(1)}" y2="${y(maxY * f).toFixed(1)}"/>`).join('');
    const last = pts[pts.length - 1];
    $('#oPaid').textContent = money(last.paid);
    $('#oTotal').textContent = money(last.total);
    $('#oGain').textContent = money(last.total - last.paid);
    fig._state = { pts, x, y, yrs };
  };

  ['#rAmt', '#rYrs', '#rRate'].forEach((s) => $(s).addEventListener('input', draw));
  draw();

  /* hover readout */
  const holder = fig.querySelector('.chart-holder');
  const tip = fig.querySelector('.chart-tip');
  const cross = svg.querySelector('.cross'), dot = svg.querySelector('.dot');
  holder.addEventListener('pointermove', (e) => {
    const { pts, x, y, yrs } = fig._state || {};
    if (!pts) return;
    const r = holder.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    let best = pts[0];
    pts.forEach((p) => { if (Math.abs(x(p.m) - mx) < Math.abs(x(best.m) - mx)) best = p; });
    cross.setAttribute('x1', x(best.m)); cross.setAttribute('x2', x(best.m));
    dot.setAttribute('cx', x(best.m)); dot.setAttribute('cy', y(best.total));
    svg.classList.add('hovering');
    tip.hidden = false;
    tip.innerHTML = `<b>year ${Math.round(best.m / 12)}</b><span>in ${money(best.paid)}</span><span class="hl">worth ${money(best.total)}</span>`;
    tip.style.left = Math.min(Math.max((x(best.m) / W) * r.width, 70), r.width - 70) + 'px';
  }, { passive: true });
  holder.addEventListener('pointerleave', () => { svg.classList.remove('hovering'); tip.hidden = true; });
})();
