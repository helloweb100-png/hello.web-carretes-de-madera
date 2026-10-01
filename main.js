/* ==========================================================================
   CARRETES GDL — main.js
   JavaScript vanilla, sin dependencias. Un solo bucle de animación (rAF)
   para todos los efectos ligados al scroll / puntero.

   Módulos:
    1  Utilidades y configuración     9  Anatomía interactiva
    2  Loader                         10 Inventario (filtro, tilt, glow)
    3  Navegación y menú móvil        11 Galería horizontal + lightbox
    4  Revelados / titulares          12 Proceso (línea de tiempo)
    5  Hero: carrete 3D               13 FAQ (acordeón)
    6  Hero: partículas               14 Formulario → WhatsApp
    7  Hero: palabras rotatorias      15 Extras (magnético, parallax, WA)
    8  Marquesina y texto "scrub"
   ========================================================================== */
(() => {
  'use strict';

  /* ======================================================================
     1 · UTILIDADES Y CONFIGURACIÓN
     ====================================================================== */
  const CONFIG = {
    phone: '5213334761066',          // WhatsApp del negocio (formato internacional, sin +)
    brand: 'Carretes GDL'
  };

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const pad2  = n => String(n).padStart(2, '0');

  const root   = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine   = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMQ = matchMedia('(min-width: 1024px)');
  if (reduce) root.classList.add('reduce');

  /** URL de WhatsApp con mensaje prellenado */
  const waURL = msg => `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;

  // Todos los enlaces con data-wa se completan con su mensaje
  $$('[data-wa]').forEach(a => { a.href = waURL(a.dataset.wa); });
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Estado de scroll compartido */
  const S = { y: scrollY, prev: scrollY, vy: 0, vh: innerHeight };
  addEventListener('scroll', () => { S.y = scrollY; }, { passive: true });
  addEventListener('resize', () => { S.vh = innerHeight; }, { passive: true });

  /* Bucle único: cada módulo registra { read, write } (primero se lee, luego se escribe) */
  const modules = [];
  const frameTasks = new Set();
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(64, t - lastT); lastT = t;
    S.vy = lerp(S.vy, S.y - S.prev, .18); S.prev = S.y;
    for (const m of modules) m.read && m.read(t, dt);
    for (const m of modules) m.write && m.write(t, dt);
    frameTasks.forEach(fn => fn(t, dt));
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     2 · LOADER (spinner con progreso)
     ====================================================================== */
  function initLoader() {
    const loader = $('#loader');
    const hero = $('#inicio');
    const startApp = () => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-loaded');
      hero && hero.classList.add('is-ready');
      setTimeout(showTip, 4200);
    };
    if (!loader) { startApp(); return; }

    const bar = $('#loaderBar'), pct = $('#loaderPct'), status = $('#loaderStatus');
    const msgs = ['Inicializando inventario', 'Cargando fotos reales', 'Calibrando carrete 3D', 'Listo para cotizar'];
    const MIN = reduce ? 250 : 2400;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let p = 0, finished = false;
    addEventListener('load', () => { loaded = true; });
    setTimeout(() => { loaded = true; }, 7000);              // seguro anti-bloqueo

    const tick = now => {
      const el = now - t0;
      const target = (loaded && el > MIN) ? 100 : Math.min(93, (el / MIN) * 93);
      p = lerp(p, target, .07);
      if (target === 100 && p > 99.3) p = 100;
      const v = Math.round(p);
      if (bar) bar.style.strokeDashoffset = String(100 - p);
      if (pct) pct.textContent = String(v);
      if (status) status.textContent = msgs[v < 30 ? 0 : v < 62 ? 1 : v < 96 ? 2 : 3];
      if (p >= 100 && !finished) {
        finished = true;
        loader.classList.add('is-done');
        setTimeout(startApp, 520);
        setTimeout(() => loader.classList.add('is-gone'), 2000);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ======================================================================
     3 · NAVEGACIÓN Y MENÚ MÓVIL
     ====================================================================== */
  function initNav() {
    const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');

    // Barra con vidrio al hacer scroll
    modules.push({ write() { nav && nav.classList.toggle('is-scrolled', S.y > 30); } });

    // Menú móvil
    if (burger && menu) {
      const setOpen = open => {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        root.classList.toggle('menu-open', open);
      };
      burger.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
      $$('a', menu).forEach(a => a.addEventListener('click', () => setOpen(false)));
      addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
      desktopMQ.addEventListener('change', e => { if (e.matches) setOpen(false); });
    }

    // Enlace activo según la sección visible (scroll-spy)
    const links = $$('[data-spy]');
    if (links.length && 'IntersectionObserver' in window) {
      const map = new Map(links.map(a => [a.dataset.spy, a]));
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          links.forEach(l => l.classList.remove('is-active'));
          const a = map.get(en.target.id);
          a && a.classList.add('is-active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
      // Al volver al hero o llegar al contacto no debe quedar nada activo
      ['inicio', 'nosotros', 'anatomia', 'contacto'].forEach(id => {
        const s = document.getElementById(id);
        s && io.observe(s);
      });
    }

    // Barra de progreso de lectura
    const bar = $('#progress');
    let max = 1;
    modules.push({
      read() { max = Math.max(1, root.scrollHeight - S.vh); },
      write() { bar && bar.style.setProperty('--sp', clamp(S.y / max).toFixed(4)); }
    });
  }

  /* ======================================================================
     4 · REVELADOS Y TITULARES PARTIDOS
     ====================================================================== */
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach((word, i, all) => {
      const outer = document.createElement('span'); outer.className = 'sw'; outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span'); inner.className = 'sw__i'; inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner); el.appendChild(outer);
      if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  function initReveal() {
    $$('[data-split]').forEach(splitWords);
    const els = $$('[data-reveal], [data-split]');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ======================================================================
     5 · HERO: CARRETE 3D (CSS 3D generado) + REACCIÓN AL PUNTERO Y SCROLL
     ====================================================================== */
  function initHero() {
    const hero = $('#inicio'), rig = $('#spoolRig');
    if (!hero) return;

    /* --- Construcción del carrete: 2 tapas (con canto), núcleo cilíndrico --- */
    let spin = null;
    if (rig) {
      const turn = document.createElement('div'); turn.className = 'spool__turn';
      const frag = document.createDocumentFragment();
      const add = (cls, style) => {
        const d = document.createElement('div'); d.className = cls;
        if (style) d.style.cssText = style;
        frag.appendChild(d);
      };
      ['t-up', 't-dn', 'b-up', 'b-dn'].forEach(c => add('sp-disc ' + c));
      for (let i = 0; i < 48; i++) { const a = `--a:${i * 7.5}deg`; add('sp-rim sp-rim--top', a); add('sp-rim sp-rim--bot', a); }
      for (let i = 0; i < 36; i++) add('sp-core', `--a:${i * 10}deg`);
      turn.appendChild(frag);
      rig.appendChild(turn);
      if (turn.animate) {
        spin = turn.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }], { duration: 28000, iterations: Infinity });
        if (reduce) spin.pause();
      }
    }

    /* --- Puntero: inclinación del carrete + linterna sobre la retícula --- */
    const m = { x: .72, y: .42, tx: 0, ty: 0, cx: 0, cy: 0, active: false };
    if (fine && !reduce) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        m.x = (e.clientX - r.left) / r.width; m.y = (e.clientY - r.top) / r.height; m.active = true;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { m.x = .72; m.y = .42; m.active = false; });
    }

    let heroH = hero.offsetHeight, hp = 0, rate = 1, lastHp = -1;
    addEventListener('resize', () => { heroH = hero.offsetHeight; }, { passive: true });
    modules.push({
      read() { hp = clamp(S.y / (heroH * .9)); },
      write() {
        // Progreso de scroll del hero (lo usa el CSS para desvanecer y desplazar)
        if (Math.abs(hp - lastHp) > .002) { hero.style.setProperty('--hp', hp.toFixed(3)); lastHp = hp; }
        if (reduce) return;
        // Inclinación suavizada
        m.tx = lerp(m.tx, (m.x - .5) * 24, .06);
        m.ty = lerp(m.ty, (m.y - .5) * -16, .06);
        m.cx = lerp(m.cx, m.x * 100, .08); m.cy = lerp(m.cy, m.y * 100, .08);
        if (rig) { rig.style.setProperty('--tx', m.tx.toFixed(2)); rig.style.setProperty('--ty', m.ty.toFixed(2)); }
        hero.style.setProperty('--mx', m.cx.toFixed(1) + '%');
        hero.style.setProperty('--my', m.cy.toFixed(1) + '%');
        // El carrete gira más rápido mientras haces scroll
        if (spin) {
          rate = lerp(rate, 1 + clamp(Math.abs(S.vy) / 10, 0, 6), .08);
          spin.playbackRate = rate;
        }
      }
    });
  }

  /* ======================================================================
     6 · HERO: PARTÍCULAS (aserrín luminoso + red sutil)
     ====================================================================== */
  function initParticles() {
    const canvas = $('#heroCanvas'), hero = $('#inicio');
    if (!canvas || !hero || reduce) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], visible = true, links = false;
    const mouse = { x: -999, y: -999 };

    // Sprites pre-renderizados (rápidos de dibujar)
    const sprite = rgb => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, `rgba(${rgb},1)`); grd.addColorStop(.35, `rgba(${rgb},.45)`); grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return c;
    };
    const sprites = [sprite('255,196,120'), sprite('255,236,205'), sprite('120,236,176')];

    const build = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 700 ? 34 : w < 1200 ? 58 : 86;
      links = w >= 900;
      parts = Array.from({ length: n }, () => {
        const z = .35 + Math.random() * .65;
        return {
          x: Math.random() * w, y: Math.random() * h, z,
          r: (.7 + Math.random() * 2.1) * z,
          vx: (Math.random() - .5) * .018, vy: -(.012 + Math.random() * .03),
          s: sprites[Math.random() < .68 ? 0 : Math.random() < .6 ? 1 : 2],
          ph: Math.random() * 6.28, tw: .0006 + Math.random() * .0016
        };
      });
    };
    build();
    addEventListener('resize', build, { passive: true });
    if (fine) {
      hero.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

    frameTasks.add((t, dt) => {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 19600) { const d = Math.sqrt(d2) || 1, f = (140 - d) / 140 * .06; p.vx += dx / d * f * .1; p.vy += dy / d * f * .1; }
        p.vx *= .985; p.vy = lerp(p.vy, -(.012 + p.z * .02), .01);
        p.x += (p.vx + Math.sin(t * .0003 + p.ph) * .008) * dt * 3 * p.z;
        p.y += p.vy * dt * 3 * p.z;
        if (p.y < -12) { p.y = h + 12; p.x = Math.random() * w; }
        if (p.x < -12) p.x = w + 12; else if (p.x > w + 12) p.x = -12;
        ctx.globalAlpha = (.45 + .55 * Math.sin(t * p.tw + p.ph) * .5 + .275) * p.z;
        const s = p.r * 7;
        ctx.drawImage(p.s, p.x - s / 2, p.y - s / 2, s, s);
      }
      if (links) {                                   // red sutil entre partículas cercanas
        ctx.lineWidth = .6;
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const a = parts[i], b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
            if (d2 < 11000) {
              ctx.globalAlpha = (1 - d2 / 11000) * .16 * Math.min(a.z, b.z);
              ctx.strokeStyle = '#f2b661';
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    });
  }

  /* ======================================================================
     7 · HERO: PALABRAS ROTATORIAS (efecto máquina por letra)
     ====================================================================== */
  function initRotator() {
    const rot = $('#rot'); if (!rot) return;
    const word = $('.rot__word', rot);
    const words = (rot.dataset.words || '').split('|').filter(Boolean);
    if (!word || words.length < 2) return;
    let i = 0;
    const paint = txt => {
      word.textContent = '';
      Array.from(txt).forEach((ch, k) => {
        const s = document.createElement('span'); s.className = 'rot__ch'; s.style.setProperty('--ci', k); s.textContent = ch;
        word.appendChild(s);
      });
    };
    const fit = () => { rot.style.width = word.getBoundingClientRect().width + 'px'; };
    paint(words[0]);
    requestAnimationFrame(fit);
    document.fonts && document.fonts.ready.then(fit);
    addEventListener('resize', fit, { passive: true });
    if (reduce) return;
    setInterval(() => {
      if (document.hidden) return;
      word.classList.add('is-out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        word.classList.remove('is-out');
        paint(words[i]); fit();
      }, 520);
    }, 3300);
  }

  /* ======================================================================
     8 · MARQUESINA (velocidad ligada al scroll) Y TEXTO "SCRUB"
     ====================================================================== */
  function initMarquee() {
    const wrap = $('.marquee'); if (!wrap || reduce) return;
    wrap.classList.add('is-js');
    const rows = $$('.marquee__row', wrap).map(row => ({
      track: $('.marquee__track', row), dir: Number(row.dataset.dir) || -1, x: 0, w: 1
    }));
    const measure = () => rows.forEach(r => {
      r.w = r.track.scrollWidth / 2;
      if (r.dir > 0 && r.x === 0) r.x = -r.w / 2;
    });
    measure();
    addEventListener('resize', measure, { passive: true });
    document.fonts && document.fonts.ready.then(measure);
    let skew = 0, on = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(wrap);
    frameTasks.add((t, dt) => {
      if (!on) return;
      skew = lerp(skew, clamp(S.vy, -40, 40) * -.12, .1);
      rows.forEach(r => {
        r.x += r.dir * (.045 * dt + Math.abs(S.vy) * .5);
        if (r.x <= -r.w) r.x += r.w; else if (r.x > 0) r.x -= r.w;
        r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      });
    });
  }

  function initScrub() {
    const el = $('[data-scrub]'); if (!el) return;
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const words = text.split(' ');
    el.setAttribute('aria-label', text);
    el.innerHTML = words.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    el.classList.add('is-split');
    const spans = $$('.w', el);
    if (reduce) { spans.forEach(s => s.classList.add('on')); return; }
    let top = 0, height = 1, shown = -1;
    modules.push({
      read() { const r = el.getBoundingClientRect(); top = r.top; height = r.height; },
      write() {
        const p = clamp((S.vh * .85 - top) / (S.vh * .4 + height));
        const n = Math.round(p * spans.length);
        if (n === shown) return;
        spans.forEach((s, i) => s.classList.toggle('on', i < n));
        shown = n;
      }
    });
  }

  /* ======================================================================
     9 · ANATOMÍA INTERACTIVA (plano técnico + acordeón con autoplay)
     ====================================================================== */
  function initAnatomy() {
    const fig = $('#anatomyFig'), list = $('#parts'); if (!fig || !list) return;
    const parts = $$('.part', list), hots = $$('.hot', fig), shapes = $$('.part-shape', fig);
    const bar = $('.parts__bar i', list);
    const DURATION = 6500;
    let cur = 0, timer = 0, inView = false, paused = false;

    const setBody = (p, open) => { const b = $('.part__body', p); if (b) b.inert = !open; };
    parts.forEach((p, i) => setBody(p, i === 0));

    const restart = () => {
      clearTimeout(timer);
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)';
      if (!inView || paused || reduce) return;
      void bar.offsetWidth;
      bar.style.transition = `transform ${DURATION}ms linear`; bar.style.transform = 'scaleX(1)';
      timer = setTimeout(() => set((cur + 1) % parts.length), DURATION);
    };
    function set(i) {
      cur = i;
      parts.forEach((p, k) => {
        const on = k === i;
        p.classList.toggle('is-active', on);
        $('.part__btn', p).setAttribute('aria-expanded', String(on));
        setBody(p, on);
      });
      hots.forEach(h => h.classList.toggle('is-active', Number(h.dataset.i) === i));
      shapes.forEach(s => s.classList.toggle('is-on', Number(s.dataset.part) === i));
      fig.classList.add('has-active');
      restart();
    }
    parts.forEach((p, i) => $('.part__btn', p).addEventListener('click', () => set(i)));
    hots.forEach(h => h.addEventListener('click', () => set(Number(h.dataset.i))));
    [fig, list].forEach(el => {
      el.addEventListener('pointerenter', () => { paused = true; restart(); });
      el.addEventListener('pointerleave', () => { paused = false; restart(); });
    });

    set(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; restart(); }, { threshold: .35 }).observe(fig);
    }
  }

  /* ======================================================================
     10 · INVENTARIO: FILTRO, TILT 3D DE TARJETAS Y BRILLO AL PUNTERO
     ====================================================================== */
  function initInventory() {
    const filters = $('#filters'), cards = $$('.card'), empty = $('#cardsEmpty');
    if (filters && cards.length) {
      const chips = $$('.chip', filters);
      chips.forEach(chip => chip.addEventListener('click', () => {
        const f = chip.dataset.filter;
        chips.forEach(c => c.classList.toggle('is-active', c === chip));
        let shown = 0;
        cards.forEach(card => {
          const match = f === 'all' || card.dataset.cat.split(' ').includes(f);
          card.hidden = !match;
          if (match) {
            shown++;
            card.classList.add('in');
            card.classList.remove('pop'); void card.offsetWidth;
            if (!reduce) { card.classList.add('pop'); card.style.setProperty('--d', '0ms'); }
          }
        });
        if (empty) empty.hidden = shown !== 0;
      }));
    }

    if (fine && !reduce) {
      cards.forEach(card => {
        card.addEventListener('pointermove', e => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
          card.classList.add('is-tilting');
          card.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
        });
        card.addEventListener('pointerleave', () => {
          card.classList.remove('is-tilting');
          card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
        });
      });
      // Brillo ámbar que sigue al puntero
      $$('.feature, .bento__item, .material, .step, .card').forEach(el => {
        el.addEventListener('pointermove', e => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--gx', (e.clientX - r.left) + 'px');
          el.style.setProperty('--gy', (e.clientY - r.top) + 'px');
        }, { passive: true });
      });
    }
  }

  /* ======================================================================
     11 · GALERÍA: SCROLL HORIZONTAL ANCLADO + LIGHTBOX
     ====================================================================== */
  function initGallery() {
    const sec = $('#galeria'), track = $('#galTrack');
    if (sec && track && !reduce) {
      const barEl = $('#galBar'), now = $('#galNow'), bg = $('.gallery__bgtext', sec);
      const total = $$('.gitem > button', track).length || 1;
      let dist = 0, top = 0, cur = 0, target = 0, lastIdx = -1;
      const measure = () => {
        dist = Math.max(0, track.scrollWidth - innerWidth);
        sec.style.setProperty('--gh', (dist + innerHeight) + 'px');
      };
      measure();
      addEventListener('resize', measure, { passive: true });
      addEventListener('load', measure);
      document.fonts && document.fonts.ready.then(measure);
      if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track);

      modules.push({
        read() { top = sec.getBoundingClientRect().top; },
        write() {
          target = dist > 0 ? clamp(-top / dist) : 0;
          cur = lerp(cur, target, .1);
          if (Math.abs(cur - target) < .0003) cur = target;
          track.style.transform = `translate3d(${(-cur * dist).toFixed(1)}px,0,0)`;
          if (barEl) barEl.style.transform = `scaleX(${cur.toFixed(4)})`;
          if (bg) bg.style.setProperty('--bx', (-cur * dist * .22).toFixed(1) + 'px');
          const idx = Math.min(total - 1, Math.round(cur * (total - 1)));
          if (now && idx !== lastIdx) { now.textContent = pad2(idx + 1); lastIdx = idx; }
        }
      });
    }

    /* --- Lightbox --- */
    const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
    const btns = $$('.gitem > button');
    if (!lb || !btns.length) return;
    const data = btns.map(b => {
      const im = $('img', b), fc = $('figcaption', b.parentElement);
      const label = fc && fc.lastChild ? fc.lastChild.textContent.trim() : '';   // texto sin el número <i>
      return { src: im.getAttribute('src'), alt: im.alt, cap: label };
    });
    let idx = 0, opener = null;
    const show = i => {
      idx = (i + data.length) % data.length;
      img.src = data[idx].src; img.alt = data[idx].alt; cap.textContent = `${pad2(idx + 1)} / ${pad2(data.length)} · ${data[idx].cap}`;
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    };
    const open = (i, btn) => { opener = btn; show(i); lb.hidden = false; root.classList.add('lb-open'); $('.lightbox__close', lb).focus(); };
    const close = () => { lb.hidden = true; root.classList.remove('lb-open'); opener && opener.focus(); };
    btns.forEach((b, i) => b.addEventListener('click', () => open(i, b)));
    $('.lightbox__close', lb).addEventListener('click', close);
    $('.lightbox__nav--prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lightbox__nav--next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {                       // atrapa el foco dentro del diálogo
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    let sx = 0;                                          // deslizar para cambiar de foto
    const fig = $('.lightbox__fig', lb);
    fig.addEventListener('pointerdown', e => { sx = e.clientX; });
    fig.addEventListener('pointerup', e => { const d = e.clientX - sx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); });
  }

  /* ======================================================================
     12 · PROCESO: LÍNEA DE TIEMPO QUE SE LLENA CON EL SCROLL
     ====================================================================== */
  function initSteps() {
    const wrap = $('#steps'); if (!wrap) return;
    const steps = $$('.step', wrap);
    let rect = null, rects = [];
    const apply = (p, lit) => {
      wrap.style.setProperty('--p', p.toFixed(3));
      steps.forEach((s, i) => s.classList.toggle('is-lit', lit[i]));
    };
    if (reduce) { apply(1, steps.map(() => true)); return; }
    modules.push({
      read() { rect = wrap.getBoundingClientRect(); rects = steps.map(s => s.getBoundingClientRect()); },
      write() {
        let p, lit;
        if (desktopMQ.matches) {                         // horizontal: se avanza por scroll vertical
          p = clamp((S.vh * .82 - rect.top) / (S.vh * .42));
          lit = steps.map((_, i) => p >= (i + .35) / steps.length);
        } else {                                         // vertical: sigue a la línea
          const y = S.vh * .62;
          p = clamp((y - rect.top) / rect.height);
          lit = rects.map(r => r.top + 40 < y);
        }
        apply(p, lit);
      }
    });
  }

  /* ======================================================================
     13 · FAQ (acordeón accesible)
     ====================================================================== */
  function initAccordion() {
    const items = $$('.acc__item'); if (!items.length) return;
    items.forEach((it, i) => {
      const btn = $('.acc__btn', it), panel = $('.acc__panel', it);
      panel.id = `acc-panel-${i}`; btn.id = `acc-btn-${i}`;
      btn.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', btn.id);
      panel.inert = !it.classList.contains('is-open');
      btn.addEventListener('click', () => {
        const willOpen = !it.classList.contains('is-open');
        items.forEach(o => {
          const on = o === it ? willOpen : false;
          o.classList.toggle('is-open', on);
          $('.acc__btn', o).setAttribute('aria-expanded', String(on));
          $('.acc__panel', o).inert = !on;
        });
      });
    });
  }

  /* ======================================================================
     14 · FORMULARIO → WHATSAPP
     ====================================================================== */
  function initForm() {
    const form = $('#quoteForm'); if (!form) return;
    const nombre = $('#f-nombre'), interes = $('#f-interes'), cantidad = $('#f-cantidad'), mensaje = $('#f-mensaje'), ok = $('#formOk');
    const validate = el => {
      const bad = !el.value.trim();
      el.closest('.field').classList.toggle('is-invalid', bad);
      el.setAttribute('aria-invalid', String(bad));
      return !bad;
    };
    [nombre, interes].forEach(el => { ['input', 'change'].forEach(ev => el.addEventListener(ev, () => { if (el.closest('.field').classList.contains('is-invalid')) validate(el); })); });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const okName = validate(nombre), okInt = validate(interes);
      if (!okName || !okInt) { (okName ? interes : nombre).focus(); return; }

      const lines = [
        `Hola, soy ${nombre.value.trim()}. Me interesa cotizar carretes de madera.`,
        '',
        `• Tipo: ${interes.value}`
      ];
      if (cantidad.value.trim()) lines.push(`• Cantidad: ${cantidad.value.trim()}`);
      if (mensaje.value.trim())  lines.push(`• Mensaje: ${mensaje.value.trim()}`);
      lines.push('', '(Enviado desde la página web)');

      const url = waURL(lines.join('\n'));
      if (ok) ok.hidden = false;
      const win = window.open(url, '_blank');
      if (win) { try { win.opener = null; } catch (_) { /* noop */ } }
      else { location.href = url; }                     // si el navegador bloquea la ventana
    });
  }

  /* ======================================================================
     15 · EXTRAS: BOTONES MAGNÉTICOS, PARALLAX SUAVE, TOOLTIP DE WHATSAPP
     ====================================================================== */
  function initExtras() {
    if (fine && !reduce) {
      $$('.magnetic').forEach(b => {
        b.addEventListener('pointermove', e => {
          const r = b.getBoundingClientRect();
          const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
          b.style.transform = `translate(${(x * .2).toFixed(1)}px, ${(y * .3).toFixed(1)}px)`;
        });
        b.addEventListener('pointerleave', () => { b.style.transform = ''; });
      });
    }

    // Parallax con inercia (usa la propiedad `translate`, independiente de transform)
    if (!reduce) {
      const items = [['.recycle__art', -.07], ['.radar', .06], ['.footer__word', .08], ['.bento__art', .05]]
        .map(([sel, k]) => { const el = $(sel); return el && { el, ref: el.parentElement, k, cur: 0, cy: 0, vis: false }; })
        .filter(Boolean);
      modules.push({
        read() { items.forEach(it => { const r = it.ref.getBoundingClientRect(); it.vis = r.bottom > -200 && r.top < S.vh + 200; it.cy = r.top + r.height / 2 - S.vh / 2; }); },
        write() {
          items.forEach(it => {
            if (!it.vis) return;
            it.cur = lerp(it.cur, it.cy * it.k, .1);
            it.el.style.translate = `0 ${it.cur.toFixed(1)}px`;
          });
        }
      });
    }
  }

  function showTip() {
    const wa = $('#waFloat'); if (!wa) return;
    wa.classList.add('is-tip');
    setTimeout(() => wa.classList.remove('is-tip'), 7000);
  }

  /* ======================================================================
     ARRANQUE
     ====================================================================== */
  initLoader();
  initNav();
  initReveal();
  initHero();
  initParticles();
  initRotator();
  initMarquee();
  initScrub();
  initAnatomy();
  initInventory();
  initGallery();
  initSteps();
  initAccordion();
  initForm();
  initExtras();
  requestAnimationFrame(frame);
})();
