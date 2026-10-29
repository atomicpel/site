/* ============================================================
   МОРСКАЯ ТЕМА · РОСГВАРДИЯ — canvas-анимация
   Слоистые волны + стреляющие боевые корабли + залпы + трассеры
   ============================================================ */
(function () {
  const canvas = document.getElementById('seaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- Звёзды / искры над морем ---------- */
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random() * .45,
    r: Math.random() * 1.4 + .3, tw: Math.random() * Math.PI * 2
  }));

  /* ---------- Слои волн (синусоидные ряды Фурье) ---------- */
  const waveLayers = [
    { amp: 10, len: 360, speed: .35, yBase: .62, color: 'rgba(10,58,110,.75)' },
    { amp: 14, len: 280, speed: -.55, yBase: .68, color: 'rgba(14,80,150,.7)' },
    { amp: 18, len: 210, speed: .8,  yBase: .74, color: 'rgba(20,105,185,.65)' },
    { amp: 22, len: 160, speed: -1.1,yBase: .82, color: 'rgba(46,155,230,.5)' },
    { amp: 26, len: 120, speed: 1.5, yBase: .9,  color: 'rgba(120,200,255,.45)' }
  ];

  function waveY(x, t, L) {
    return Math.sin((x / L.len) * Math.PI * 2 + t * L.speed) * L.amp
         + Math.sin((x / (L.len * .47)) * Math.PI * 2 + t * L.speed * 1.7) * L.amp * .35
         + Math.sin((x / (L.len * 2.3)) * Math.PI * 2 - t * L.speed * .6) * L.amp * .5;
  }

  function drawWaves(t) {
    for (const L of waveLayers) {
      const base = H * L.yBase;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        ctx.lineTo(x, base + waveY(x, t, L));
      }
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, base - 40, 0, H);
      g.addColorStop(0, L.color);
      g.addColorStop(1, 'rgba(2,14,30,.95)');
      ctx.fillStyle = g;
      ctx.fill();
      // блик гребня
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = base + waveY(x, t, L);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(234,244,255,.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /* ---------- Корабли ---------- */
  class Ship {
    constructor(opts) {
      this.scale = opts.scale || 1;
      this.dir = opts.dir || 1;                 // 1 вправо, -1 влево
      this.layer = opts.layer || 2;             // слой волн для качки
      this.x = opts.x ?? (this.dir === 1 ? -220 : W + 220);
      this.baseYFrac = opts.y || .66;
      this.speed = (opts.speed || 26) * this.dir;
      this.fireEvery = opts.fireEvery || 4;     // сек между залпами
      this.fireTimer = Math.random() * this.fireEvery;
      this.type = opts.type || 'patrol';        // patrol | corvette
      this.bob = Math.random() * Math.PI * 2;
    }
    get hullW() { return (this.type === 'corvette' ? 190 : 150) * this.scale; }
    update(dt, t) {
      this.x += this.speed * dt;
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) { this.fire(t); this.fireTimer = this.fireEvery; }
      if (this.dir === 1 && this.x > W + 300) this.x = -300;
      if (this.dir === -1 && this.x < -300) this.x = W + 300;
    }
    fire() {
      const deckY = this.y() - 26 * this.scale;
      const muzzleX = this.x + this.dir * this.hullW * .32;
      cannons.push(new Cannonball(muzzleX, deckY, this.dir, this.scale));
      flashes.push({ x: muzzleX, y: deckY, life: .18, max: .18, s: this.scale });
      // звук-визуал: дымка
      for (let i = 0; i < 6; i++) smoke.push(new Smoke(muzzleX, deckY, this.dir));
    }
    y() {
      const L = waveLayers[this.layer];
      return H * this.baseYFrac + waveY(this.x, time, L) * .8;
    }
    draw(t) {
      const y = this.y();
      const roll = Math.cos((this.x / waveLayers[this.layer].len) * Math.PI * 2 + t * waveLayers[this.layer].speed) * .05 * this.dir;
      ctx.save();
      ctx.translate(this.x, y);
      ctx.rotate(roll);
      ctx.scale(this.dir, 1);
      const s = this.scale, w = this.hullW / s;

      // отражение/тень на воде
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.ellipse(0, 10 * s, w * .55, 6 * s, 0, 0, Math.PI * 2); ctx.fill();

      // корпус
      ctx.beginPath();
      ctx.moveTo(-w * .5, -8 * s);
      ctx.lineTo(w * .5, -8 * s);
      ctx.lineTo(w * .42, 6 * s);
      ctx.lineTo(-w * .4, 6 * s);
      ctx.closePath();
      const hullG = ctx.createLinearGradient(0, -10 * s, 0, 8 * s);
      hullG.addColorStop(0, '#3a4a5a'); hullG.addColorStop(.55, '#232f3c'); hullG.addColorStop(1, '#141c26');
      ctx.fillStyle = hullG; ctx.fill();
      // ватерлиния красная
      ctx.fillStyle = '#7a2334';
      ctx.fillRect(-w * .48, 2 * s, w * .95, 3.4 * s);

      // надстройка
      ctx.fillStyle = '#4b5b6b';
      ctx.fillRect(-w * .18, -22 * s, w * .3, 14 * s);
      ctx.fillStyle = '#5d6f80';
      ctx.fillRect(-w * .1, -30 * s, w * .16, 9 * s);
      // иллюминаторы
      ctx.fillStyle = '#ffd76a';
      for (let i = 0; i < 5; i++) ctx.fillRect(-w * .15 + i * w * .06, -18 * s, 2.4 * s, 2.4 * s);

      // мачта с антенной и фонарём
      ctx.strokeStyle = '#8fa3b5'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(0, -30 * s); ctx.lineTo(0, -46 * s); ctx.stroke();
      ctx.fillStyle = (Math.floor(t * 2) % 2) ? '#ff5a5a' : '#5a1414';
      ctx.beginPath(); ctx.arc(0, -47 * s, 2 * s, 0, Math.PI * 2); ctx.fill();

      // орудийная башня (ствол поднимается при выстреле)
      const elev = clamp((this.fireEvery - this.fireTimer) * 3, 0, 1);
      ctx.save();
      ctx.translate(w * .3, -12 * s);
      ctx.fillStyle = '#62748a';
      ctx.beginPath(); ctx.arc(0, 0, 6 * s, Math.PI, 0); ctx.fill();
      ctx.rotate(-.18 * elev);
      ctx.fillStyle = '#333f4d';
      ctx.fillRect(0, -1.8 * s, 20 * s, 3.6 * s);
      ctx.restore();

      // кормовой артиллерийский комплекс
      ctx.save();
      ctx.translate(-w * .34, -12 * s);
      ctx.fillStyle = '#5a6b7d';
      ctx.beginPath(); ctx.arc(0, 0, 4.6 * s, Math.PI, 0); ctx.fill();
      ctx.rotate(Math.PI + -.1 * elev);
      ctx.fillStyle = '#333f4d';
      ctx.fillRect(0, -1.4 * s, 13 * s, 2.8 * s);
      ctx.restore();

      // флаг Росгвардии (краповый с золотым)
      const fw = 14 * s, fh = 9 * s, fx = -w * .02, fy = -45 * s;
      ctx.fillStyle = '#6b1f3a';
      ctx.fillRect(fx, fy + Math.sin(t * 6) * 1.2, fw, fh);
      ctx.fillStyle = '#d9b44a';
      ctx.beginPath(); ctx.arc(fx + fw * .5, fy + fh * .5 + Math.sin(t * 6) * 1.2, 2.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  /* ---------- Снаряды, вспышки, дым, трассеры ---------- */
  const cannons = [], flashes = [], smoke = [], trails = [];

  class Cannonball {
    constructor(x, y, dir, s) {
      this.x = x; this.y = y;
      this.vx = dir * (240 + Math.random() * 90) * s;
      this.vy = -(90 + Math.random() * 50) * s;
      this.g = 260 * s; this.s = s; this.life = 6;
      const targetX = x + this.vx * 1.6;
      this.explodeAt = { x: targetX, y: H * .8 };
      trails.push({ x1: x, y1: y, x2: x, y2: y, life: .35, max: .35 });
    }
    update(dt) {
      this.x += this.vx * dt; this.y += this.vy * dt; this.vy += this.g * dt;
      this.life -= dt;
      const tr = trails[trails.length - 1];
      if (tr && tr.max === .35) { tr.x2 = this.x; tr.y2 = this.y; }
      // падение за экран или "в воду" -> взрыв брызг
      if (this.y > H * .78 || this.life <= 0 || this.x < -100 || this.x > W + 100) {
        splash.push({ x: clamp(this.x, 0, W), y: H * .78, life: .7, max: .7, parts: makeSpray(clamp(this.x, 0, W), H * .78) });
        this.dead = true;
      }
    }
    draw() {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(this.x, this.y, 2.6 * this.s, 0, Math.PI * 2); ctx.fill();
    }
  }
  function makeSpray(x, y) {
    const p = [];
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.8;
      const v = 60 + Math.random() * 160;
      p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1 + Math.random() * 2.4 });
    }
    return p;
  }
  class Smoke {
    constructor(x, y, dir) {
      this.x = x; this.y = y;
      this.vx = dir * (10 + Math.random() * 20); this.vy = -(10 + Math.random() * 25);
      this.r = 3 + Math.random() * 5; this.life = 1 + Math.random(); this.max = this.life;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy -= 6 * dt; this.r += 14 * dt; this.life -= dt; }
    draw() {
      ctx.fillStyle = `rgba(180,180,180,${(this.life / this.max) * .28})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  const splash = [];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Запуск симуляции ---------- */
  const ships = [
    new Ship({ scale: .8, dir: 1,  x: W * .2,  y: .58, speed: 20, fireEvery: 3.4, type: 'patrol' }),
    new Ship({ scale: 1.15, dir: -1, x: W * .78, y: .66, speed: 14, fireEvery: 5,  type: 'corvette' }),
    new Ship({ scale: .55, dir: 1,  x: W * .5,  y: .5,  speed: 30, fireEvery: 7,  type: 'patrol' })
  ];

  let time = 0, last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now; time += dt;

    ctx.clearRect(0, 0, W, H);

    // небо-градиент уже в CSS, рисуем звёзды
    for (const st of stars) {
      const a = .35 + .65 * Math.abs(Math.sin(time * 1.5 + st.tw));
      ctx.fillStyle = `rgba(220,235,255,${a})`;
      ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2); ctx.fill();
    }

    drawWaves(time * .6);

    // корабли задних слоёв, затем передних
    ships.sort((a, b) => a.baseYFrac - b.baseYFrac);
    for (const sh of ships) {
      sh.update(dt, time);
      // волны за кораблём частично перекрывают его — нарисуем 2 нижних слоя поверх
      sh.draw(time);
    }
    drawWavesFront(time * .6);

    // снаряды
    for (let i = cannons.length - 1; i >= 0; i--) {
      const c = cannons[i]; c.update(dt); c.draw();
      if (c.dead) cannons.splice(i, 1);
    }
    // трассеры
    ctx.lineCap = 'round';
    for (let i = trails.length - 1; i >= 0; i--) {
      const tr = trails[i]; tr.life -= dt;
      ctx.strokeStyle = `rgba(255,215,106,${(tr.life / tr.max) * .8})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
      if (tr.life <= 0) trails.splice(i, 1);
    }
    // дым
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; s.update(dt); s.draw();
      if (s.life <= 0) smoke.splice(i, 1);
    }
    // вспышки у дула
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life -= dt;
      const k = Math.max(f.life / f.max, 0);
      const r1 = Math.max(26 * f.s * k + 6, .5);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r1);
      g.addColorStop(0, `rgba(255,240,180,${k})`);
      g.addColorStop(.4, `rgba(255,160,60,${k * .8})`);
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, 30 * f.s, 0, Math.PI * 2); ctx.fill();
      if (f.life <= 0) flashes.splice(i, 1);
    }
    // всплески от попаданий
    for (let i = splash.length - 1; i >= 0; i--) {
      const sp = splash[i]; sp.life -= dt;
      const k = sp.life / sp.max;
      for (const p of sp.parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
        ctx.fillStyle = `rgba(230,245,255,${k})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + .4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = `rgba(200,230,255,${k * .6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 4, (1 - k) * 60 + 6, (1 - k) * 14 + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (sp.life <= 0) splash.splice(i, 1);
    }

    requestAnimationFrame(frame);
  }

  function drawWavesFront(t) {
    // два самых близких слоя рисуем ПОСЛЕ кораблей — эффект «впереди по курсу»
    for (const L of waveLayers.slice(3)) {
      const base = H * L.yBase;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base + waveY(x, t, L));
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, base - 30, 0, H);
      g.addColorStop(0, L.color); g.addColorStop(1, 'rgba(2,14,30,.98)');
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y = base + waveY(x, t, L);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(234,244,255,.22)'; ctx.lineWidth = 1.6; ctx.stroke();
    }
  }

  requestAnimationFrame(frame);

  /* ---------- Reveal-on-scroll + счётчики ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  document.querySelectorAll('.counter .num').forEach(el => {
    const target = parseInt(el.dataset.count || '0', 10);
    const co = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      co.disconnect();
      const t0 = performance.now();
      (function tick(now) {
        const k = Math.min((now - t0) / 1600, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }), { threshold: .5 });
    co.observe(el);
  });

  /* ---------- Бургер-меню ---------- */
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('nav.main');
  if (burger && nav) burger.addEventListener('click', () => nav.classList.toggle('open'));
})();
