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
