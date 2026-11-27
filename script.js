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

/* ============================================================
   v6: motion
   CSS scroll-driven animations do the heavy lifting where they exist.
   This file only does what CSS cannot: split headings into lines so each
   can rise from behind its own mask, drive the cursor, read scroll velocity,
   and stand in with an observer for browsers without view() timelines.
   ============================================================ */
(() => {
  if (reduceMotion) return;
  const hasTimelines = CSS.supports('animation-timeline: view()');
  document.documentElement.classList.add('js');

  /* ---------- split headings into masked lines ---------- */
  const splitLines = (el) => {
    if (el.dataset.split) return;
    if (!el.dataset.orig) el.dataset.orig = el.innerHTML;
    const words = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((w) => w.length && words.push({ t: w }));
      } else if (n.nodeName === 'BR') {
        words.push({ br: true });
      } else {
        words.push({ el: n });
      }
    });

    /* measure where the browser actually breaks, then group by line box */
    const probe = document.createElement('span');
    el.textContent = '';
    const spans = words.map((w) => {
      if (w.br) { const b = document.createElement('br'); el.appendChild(b); return { br: true, node: b }; }
      const s = document.createElement('span');
      s.style.display = 'inline';
      if (w.el) s.appendChild(w.el); else s.textContent = w.t;
      el.appendChild(s);
      return { node: s, ws: !w.el && !w.t.trim() };
    });
    probe.remove();

    const lines = [];
    let cur = [], top = null;
    spans.forEach((s) => {
      if (s.br) { lines.push(cur); cur = []; top = null; return; }
      const t = Math.round(s.node.getBoundingClientRect().top);
      if (top === null) top = t;
      if (t > top + 4) { lines.push(cur); cur = []; top = t; }
      cur.push(s.node);
    });
    if (cur.length) lines.push(cur);

    el.textContent = '';
    lines.forEach((nodes) => {
      const wrap = document.createElement('span');
      wrap.className = 'ln';
      const inner = document.createElement('span');
      nodes.forEach((n) => inner.appendChild(n));
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
    el.dataset.split = '1';
    el.classList.add('ready');
  };

  const headings = document.querySelectorAll(
    'h1, .section-head h2, .faces-head h2, .manifesto h2, .closing h2, .read-sec h2'
  );
  const doSplit = () => headings.forEach(splitLines);
  const reSplit = () => headings.forEach((h) => {
    if (!h.dataset.orig) return;
    h.innerHTML = h.dataset.orig;
    delete h.dataset.split;
    splitLines(h);
    h.classList.add('seen', 'ready');
  });
  /* Split straight away rather than waiting on webfonts: the headline is the
     first thing anyone sees and must not be blank while a font downloads.
     Re-split once the real font is in, because the line breaks move. */
  doSplit();
  if (document.fonts) document.fonts.ready.then(reSplit);

  /* resplit on resize, because the line breaks move */
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(reSplit, 220);
  });

  /* ---------- observer fallback where view() timelines are missing ---------- */
  if (!hasTimelines && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal, .wipe, .section-head, .faces-head, h1, .read-sec h2')
      .forEach((el) => io.observe(el));
    /* the hero is above the fold: show it immediately */
    requestAnimationFrame(() => document.querySelectorAll('.hero .reveal, .hero h1').forEach((e) => e.classList.add('seen')));
  } else {
    document.querySelectorAll('h1').forEach((h) => h.classList.add('seen'));
  }

  /* ---------- scroll velocity drives the marquees ---------- */
  let lastY = scrollY, vel = 0, raf = 0;
  const onScroll = () => {
    const y = scrollY;
    vel = vel * 0.8 + (y - lastY) * 0.2;
    lastY = y;
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      const v = Math.max(-1, Math.min(1, vel / 45));
      document.documentElement.style.setProperty('--vel', v.toFixed(3));
      document.documentElement.style.setProperty('--rush', (1 + Math.abs(v) * 2.2).toFixed(2));
    });
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- cursor ---------- */
  if (matchMedia('(pointer: fine)').matches) {
    const cur = document.querySelector('.cursor');
    if (cur) {
      let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, on = false;
      addEventListener('pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
        if (!on) { on = true; cur.classList.add('on'); x = tx; y = ty; }
        const hot = e.target.closest('a, button, .read-card, .rung, input[type="range"], .cos-card, .sheet-grid img');
        cur.classList.toggle('hot', !!hot);
      }, { passive: true });
      addEventListener('pointerleave', () => { on = false; cur.classList.remove('on'); });
      (function loop() {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        cur.style.transform = `translate3d(${x}px,${y}px,0)`;
        requestAnimationFrame(loop);
      })();
    }
  }
})();
