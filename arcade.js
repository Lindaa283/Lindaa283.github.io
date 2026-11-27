/* ============================================================
   BACK LINDA — the quarter round
   A real-time canvas round: orbs spiral in, you swing a shield
   around her and catch what you want her to spend the quarter on.
   Resolves to the same resource counts the old token UI produced,
   so the balance tables still apply.
   ============================================================ */
'use strict';

const Arcade = (() => {
  const TAU = Math.PI * 2;

  const TYPES = {
    lab:    { c: '#5fd8ff', glow: 'rgba(95,216,255',  label: 'LAB',    sym: '⌬' },
    shop:   { c: '#f0c04a', glow: 'rgba(240,192,74',  label: 'SHOP',   sym: '€' },
    build:  { c: '#ff4f86', glow: 'rgba(255,79,134',  label: 'BUILD',  sym: '◆' },
    market: { c: '#5ef0a8', glow: 'rgba(94,240,168',  label: 'MARKET', sym: '↗' },
    rest:   { c: '#c3a8ff', glow: 'rgba(195,168,255', label: 'REST',   sym: '✦' },
    drain:  { c: '#ff2d2d', glow: 'rgba(255,45,45',   label: 'DRAIN',  sym: '✕' },
  };
  const GETTABLE = ['lab', 'shop', 'build', 'market', 'rest'];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  function run(canvas, opts) {
    return new Promise((resolve) => {
      const DUR = opts.duration ?? 20000;
      const portrait = opts.portrait;
      const onTick = opts.onTick || (() => {});
      /* per-quarter flavour: which orbs are common, how mean the round is */
      const bias = opts.bias || {};
      const hazardRate = opts.hazard ?? 0.17;
      const speedMul = opts.speed ?? 1;
      const weighted = [];
      GETTABLE.forEach((k) => { for (let i = 0; i < (bias[k] || 1) * 10; i++) weighted.push(k); });

      const ctx = canvas.getContext('2d', { alpha: true });
      let W = 0, H = 0, CX = 0, CY = 0, R = 0, dpr = 1;

      function size() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        W = r.width; H = r.height;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        CX = W / 2; CY = H / 2;
        R = Math.min(W, H) * 0.30;            // shield orbit radius
      }
      size();
      const ro = new ResizeObserver(size); ro.observe(canvas);

      /* ---------- input: shield angle follows the pointer ---------- */
      let aim = -Math.PI / 2, aimTarget = -Math.PI / 2, holding = false;
      const toAngle = (cx, cy) => {
        const r = canvas.getBoundingClientRect();
        return Math.atan2(cy - r.top - CY, cx - r.left - CX);
      };
      const move = (e) => {
        const p = e.touches ? e.touches[0] : e;
        aimTarget = toAngle(p.clientX, p.clientY);
      };
      const down = (e) => { holding = true; move(e); };
      const up = () => { holding = false; };
      canvas.addEventListener('pointermove', move, { passive: true });
      canvas.addEventListener('pointerdown', down, { passive: true });
      window.addEventListener('pointerup', up, { passive: true });
      /* keyboard: arrows / A-D sweep the shield */
      let keyDir = 0;
      const kd = (e) => { if (['ArrowLeft', 'a'].includes(e.key)) keyDir = -1; if (['ArrowRight', 'd'].includes(e.key)) keyDir = 1; };
      const ku = () => { keyDir = 0; };
      window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

      /* ---------- world ---------- */
      const orbs = [], parts = [], pops = [], rings = [];
      const got = { lab: 0, shop: 0, build: 0, market: 0, rest: 0 };
      let combo = 0, best = 0, caught = 0, missed = 0, drained = 0, blocked = 0;
      let shake = 0, flash = 0, flashCol = '255,255,255';
      let t0 = performance.now(), last = t0, spawnAcc = 0, done = false;
      const SHIELD_ARC = 0.62;

      function spawnOrb() {
        const hazard = Math.random() < hazardRate;
        const k = hazard ? 'drain' : pick(weighted);
        const a = rand(0, TAU);
        const d = Math.max(W, H) * 0.62;
        orbs.push({
          k, a, d,
          spin: rand(-0.0009, 0.0009),
          v: rand(0.055, 0.1) * (hazard ? 1.25 : 1) * speedMul,
          r: hazard ? 11 : 13,
          trail: [],
          dead: false,
        });
      }

      function burst(x, y, col, n, power) {
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU), s = rand(0.06, 0.34) * power;
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col, r: rand(1.4, 3.6) });
        }
      }
      function pop(x, y, text, col) { pops.push({ x, y, text, col, life: 1 }); }

      /* ---------- loop ---------- */
      function frame(now) {
        if (done) return;
        const dt = Math.min(now - last, 48); last = now;
        const elapsed = now - t0;
        const left = Math.max(0, DUR - elapsed);
        const prog = elapsed / DUR;

        /* difficulty ramps across the round */
        spawnAcc += dt;
        const gap = lerp(560, 300, Math.min(prog, 1));
        if (spawnAcc > gap) { spawnAcc = 0; spawnOrb(); }

        /* aim easing + keyboard */
        if (keyDir) aimTarget += keyDir * dt * 0.006;
        aim += angDiff(aimTarget, aim) * Math.min(1, dt * 0.018);

        /* ---------- update orbs ---------- */
        for (const o of orbs) {
          o.a += o.spin * dt;
          o.d -= o.v * dt;
          const x = CX + Math.cos(o.a) * o.d, y = CY + Math.sin(o.a) * o.d;
          o.x = x; o.y = y;
          o.trail.push(x, y);
          if (o.trail.length > 16) o.trail.splice(0, 2);

          /* crossing the shield band */
          if (!o.dead && o.d <= R + 14 && o.d >= R - 16) {
            const hit = Math.abs(angDiff(o.a, aim)) < SHIELD_ARC / 2;
            if (hit) {
              o.dead = true;
              const T = TYPES[o.k];
              if (o.k === 'drain') {
                combo = 0; blocked++;
                shake = 9; flash = .45; flashCol = '255,45,45';
                burst(x, y, '255,45,45', 18, 1.1);
                pop(x, y, 'BLOCKED', '#ff9ec4');
              } else {
                combo++; caught++;
                best = Math.max(best, combo);
                const mult = combo >= 6 ? 3 : combo >= 3 ? 2 : 1;
                got[o.k] += mult === 1 ? 1 : mult === 2 ? 1.5 : 2;
                shake = Math.min(10, 4 + mult * 2); flash = 0.5; flashCol = T.glow.slice(5);
                burst(x, y, T.glow.slice(5), 14 + mult * 8, 1 + mult * 0.3);
                pop(x, y, mult > 1 ? `${T.label} ×${mult}` : T.label, T.c);
                rings.push({ x, y, r: 10, life: 1, col: T.c });
              }
            }
          }
          /* reached her */
          if (!o.dead && o.d <= R * 0.42) {
            o.dead = true;
            if (o.k === 'drain') {
              combo = 0; drained++;
              shake = 22; flash = 1; flashCol = '255,45,45';
              burst(x, y, '255,45,45', 34, 1.9);
              pop(CX, CY - R * 0.6, '−ENERGY', '#ff2d2d');
            } else { missed++; combo = 0; burst(x, y, '160,140,180', 8, .6); }
          }
        }
        for (let i = orbs.length - 1; i >= 0; i--) if (orbs[i].dead || orbs[i].d < 0) orbs.splice(i, 1);

        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0004 * dt;
          p.life -= dt / 760;
          if (p.life <= 0) parts.splice(i, 1);
        }
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= dt * 0.035; pops[i].life -= dt / 900; if (pops[i].life <= 0) pops.splice(i, 1); }
        for (let i = rings.length - 1; i >= 0; i--) { rings[i].r += dt * 0.22; rings[i].life -= dt / 520; if (rings[i].life <= 0) rings.splice(i, 1); }

        shake = Math.max(0, shake - dt * 0.055);
        flash = Math.max(0, flash - dt * 0.004);

        draw(elapsed, left, prog);
        onTick({ left, combo, caught, got });

        if (left <= 0) return end();
        requestAnimationFrame(frame);
      }

      /* ---------- draw ---------- */
      function draw(elapsed, left, prog) {
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (shake > 0.4) ctx.translate(rand(-shake, shake) * .5, rand(-shake, shake) * .5);

        /* orbit guides */
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(CX, CY, R * (0.42 + i * 0.29), 0, TAU);
          ctx.strokeStyle = `rgba(255,158,196,${0.05 + i * 0.015})`;
          ctx.lineWidth = 1;
          ctx.setLineDash(i === 1 ? [4, 10] : []);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        /* trails + orbs */
        for (const o of orbs) {
          const T = TYPES[o.k];
          for (let i = 0; i < o.trail.length - 2; i += 2) {
            const a = (i / o.trail.length) * 0.4;
            ctx.beginPath();
            ctx.arc(o.trail[i], o.trail[i + 1], o.r * (i / o.trail.length) * 0.7, 0, TAU);
            ctx.fillStyle = `${T.glow},${a})`;
            ctx.fill();
          }
          const pulse = 1 + Math.sin(elapsed * 0.012 + o.a * 4) * 0.12;
          const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3.4 * pulse);
          g.addColorStop(0, `${T.glow},0.95)`);
          g.addColorStop(0.35, `${T.glow},0.42)`);
          g.addColorStop(1, `${T.glow},0)`);
          ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 3.4 * pulse, 0, TAU); ctx.fillStyle = g; ctx.fill();
          ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.55, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.font = `700 ${o.r}px "Space Mono", monospace`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = T.c;
          ctx.fillText(T.sym, o.x, o.y + o.r * 1.9);
        }

        /* shockwave rings */
        for (const r of rings) {
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU);
          ctx.strokeStyle = r.col; ctx.globalAlpha = r.life * 0.6; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.globalAlpha = 1;
        }

        /* particles */
        for (const p of parts) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, TAU);
          ctx.fillStyle = `rgba(${p.col},${p.life})`; ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';

        /* her, in the middle */
        const coreR = R * 0.42;
        ctx.save();
        ctx.beginPath(); ctx.arc(CX, CY, coreR, 0, TAU); ctx.clip();
        if (portrait && portrait.complete && portrait.naturalWidth) {
          const s = Math.max(coreR * 2 / portrait.naturalWidth, coreR * 2 / portrait.naturalHeight);
          const w = portrait.naturalWidth * s, h = portrait.naturalHeight * s;
          ctx.drawImage(portrait, CX - w / 2, CY - h / 2, w, h);
        } else { ctx.fillStyle = '#2a1636'; ctx.fillRect(CX - coreR, CY - coreR, coreR * 2, coreR * 2); }
        ctx.restore();
        ctx.beginPath(); ctx.arc(CX, CY, coreR, 0, TAU);
        ctx.strokeStyle = 'rgba(255,158,196,.75)'; ctx.lineWidth = 2; ctx.stroke();

        /* rotating tick ring */
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(elapsed * 0.00035);
        for (let i = 0; i < 48; i++) {
          ctx.beginPath();
          const a = (i / 48) * TAU, rr = coreR + 9;
          ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          ctx.lineTo(Math.cos(a) * (rr + (i % 6 === 0 ? 7 : 3)), Math.sin(a) * (rr + (i % 6 === 0 ? 7 : 3)));
          ctx.strokeStyle = `rgba(195,168,255,${i % 6 === 0 ? .55 : .2})`; ctx.lineWidth = 1.4; ctx.stroke();
        }
        ctx.restore();

        /* the shield */
        const sg = ctx.createLinearGradient(CX - R, CY, CX + R, CY);
        sg.addColorStop(0, '#ff4f86'); sg.addColorStop(.5, '#ff9ec4'); sg.addColorStop(1, '#c3a8ff');
        ctx.beginPath();
        ctx.arc(CX, CY, R, aim - SHIELD_ARC / 2, aim + SHIELD_ARC / 2);
        ctx.strokeStyle = sg; ctx.lineWidth = 11; ctx.lineCap = 'round';
        ctx.shadowColor = '#ff4f86'; ctx.shadowBlur = 22;
        ctx.stroke();
        ctx.shadowBlur = 0;
        /* shield nubs */
        [-1, 1].forEach((s) => {
          const a = aim + s * SHIELD_ARC / 2;
          ctx.beginPath(); ctx.arc(CX + Math.cos(a) * R, CY + Math.sin(a) * R, 4, 0, TAU);
          ctx.fillStyle = '#fff'; ctx.fill();
        });

        /* combo */
        if (combo >= 2) {
          ctx.font = `800 ${Math.min(46, 22 + combo * 3)}px "Archivo", sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = combo >= 6 ? '#5ef0a8' : combo >= 3 ? '#f0c04a' : '#ff9ec4';
          ctx.globalAlpha = .9;
          ctx.fillText(`${combo}× COMBO`, CX, CY + R + 42);
          ctx.globalAlpha = 1;
        }

        /* floating labels */
        for (const p of pops) {
          ctx.font = '800 13px "Space Mono", monospace';
          ctx.textAlign = 'center'; ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y);
          ctx.globalAlpha = 1;
        }

        /* timer arc */
        ctx.beginPath();
        ctx.arc(CX, CY, R + 26, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - prog));
        ctx.strokeStyle = prog > 0.8 ? '#ff2d2d' : 'rgba(255,255,255,.3)';
        ctx.lineWidth = 3; ctx.lineCap = 'butt'; ctx.stroke();

        ctx.restore();

        if (flash > 0.01) {
          ctx.fillStyle = `rgba(${flashCol},${flash * 0.3})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      function end() {
        done = true;
        ro.disconnect();
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerdown', down);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        resolve({ got, caught, missed, drained, blocked, best });
      }

      requestAnimationFrame(frame);
    });
  }

  return { run, TYPES };
})();
