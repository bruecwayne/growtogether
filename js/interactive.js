/* ═══════════════════════════════════════════════════════════════
   GrowTogether — Interactive enhancements engine
   All behavior is opt-out via [data-gt-ia-*="off"] on <body>
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ──────────────────────────────────────────────────────────
  // Tweaks persistence
  // ──────────────────────────────────────────────────────────
  const TWEAK_KEYS = ['motion', 'cursor', 'parallax', 'confetti', 'scrollbar', 'heroPot'];
  const defaultTweaks = {
    motion: !prefersReduced,
    cursor: !prefersReduced && !('ontouchstart' in window),
    parallax: !prefersReduced,
    confetti: !prefersReduced,
    scrollbar: true,
    heroPot: true,
  };
  let tweaks = { ...defaultTweaks };
  try {
    const saved = JSON.parse(localStorage.getItem('gt-ia-tweaks') || '{}');
    tweaks = { ...tweaks, ...saved };
  } catch (e) {}
  function saveTweaks() {
    try { localStorage.setItem('gt-ia-tweaks', JSON.stringify(tweaks)); } catch (e) {}
    applyTweaks();
  }
  function applyTweaks() {
    document.body.dataset.gtIaMotion    = tweaks.motion    ? 'on' : 'off';
    document.body.dataset.gtIaCursor    = tweaks.cursor    ? 'on' : 'off';
    document.body.dataset.gtIaParallax  = tweaks.parallax  ? 'on' : 'off';
    document.body.dataset.gtIaConfetti  = tweaks.confetti  ? 'on' : 'off';
    document.body.dataset.gtIaScrollbar = tweaks.scrollbar ? 'on' : 'off';
    document.body.dataset.gtIaHeroPot   = tweaks.heroPot   ? 'on' : 'off';
    const bar = document.querySelector('.gt-ia-scroll-progress');
    if (bar) bar.style.display = tweaks.scrollbar ? 'block' : 'none';
    const pot = document.querySelector('.gt-ia-pot');
    if (pot) pot.style.display = tweaks.heroPot ? 'block' : 'none';
  }

  // ──────────────────────────────────────────────────────────
  // 1. Scroll progress bar
  // ──────────────────────────────────────────────────────────
  function initScrollBar() {
    const wrap = document.createElement('div');
    wrap.className = 'gt-ia-scroll-progress';
    wrap.innerHTML = '<div class="fill"></div>';
    document.body.appendChild(wrap);
    const fill = wrap.querySelector('.fill');
    function update() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0;
      fill.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ──────────────────────────────────────────────────────────
  // 2. Hero scene: sun, seeds, pot grow animation
  // ──────────────────────────────────────────────────────────
  const CROPS = {
    tomato: {
      label: 'Tomato', emo: '🍅',
      stemColor: '#3d6b4f',
      leafColor: '#5a8a5a',
      fruit: { color: '#e85c3c', highlight: '#ff8a6a', stroke: '#a53c22' },
      stages: ['Seed', 'Sprout', 'Flower', 'Fruit'],
    },
    chili: {
      label: 'Chili', emo: '🌶',
      stemColor: '#3d6b4f',
      leafColor: '#4f8050',
      fruit: { color: '#d9412b', highlight: '#f26a50', stroke: '#8c2414' },
      stages: ['Seed', 'Sprout', 'Flower', 'Heat'],
    },
    paddy: {
      label: 'Paddy', emo: '🌾',
      stemColor: '#7a8f3d',
      leafColor: '#b9b061',
      fruit: { color: '#d4a84b', highlight: '#f0d68a', stroke: '#8a6f25' },
      stages: ['Seed', 'Tiller', 'Grain', 'Golden'],
    },
    turmeric: {
      label: 'Turmeric', emo: '🟡',
      stemColor: '#4a7a3d',
      leafColor: '#6a9654',
      fruit: { color: '#e0a92b', highlight: '#f5cc5e', stroke: '#a06914' },
      stages: ['Root', 'Shoot', 'Bloom', 'Harvest'],
    },
    maize: {
      label: 'Maize', emo: '🌽',
      stemColor: '#5a7a3d',
      leafColor: '#7aa047',
      fruit: { color: '#f0d68a', highlight: '#ffe8a8', stroke: '#c2903c' },
      stages: ['Seed', 'Shoot', 'Silk', 'Cob'],
    },
  };

  function initHeroScene() {
    const hero = document.querySelector('.hero, #hero, [class*="hero"]');
    if (!hero) return;
    // Find a suitable container inside hero for the scene
    let scene = hero.querySelector('.gt-ia-hero-scene');
    if (!scene) {
      scene = document.createElement('div');
      scene.className = 'gt-ia-hero-scene';
      scene.innerHTML = '<div class="sun"></div>';
      // Drop a dozen seeds
      for (let i = 0; i < 14; i++) {
        const s = document.createElement('div');
        s.className = 'gt-ia-seed';
        s.style.left = (Math.random() * 100) + '%';
        s.style.animationDuration = (10 + Math.random() * 14) + 's';
        s.style.animationDelay = (-Math.random() * 20) + 's';
        s.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
        scene.appendChild(s);
      }
      hero.insertBefore(scene, hero.firstChild);
      // Ensure hero can position scene
      const cs = getComputedStyle(hero);
      if (cs.position === 'static') hero.style.position = 'relative';
    }

    // ── Hero pot SVG ─────────────────────────────────────────
    const pot = document.createElement('div');
    pot.className = 'gt-ia-pot';
    pot.innerHTML = `
      <svg viewBox="0 0 260 260" aria-hidden="true">
        <defs>
          <radialGradient id="gt-ia-pot-grad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#c27043"/>
            <stop offset="70%" stop-color="#9a5532"/>
            <stop offset="100%" stop-color="#6d3a20"/>
          </radialGradient>
          <linearGradient id="gt-ia-soil-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3e2817"/>
            <stop offset="100%" stop-color="#2a1a0e"/>
          </linearGradient>
        </defs>
        <!-- Pot -->
        <path d="M 60 170 L 80 235 Q 80 250 95 250 L 165 250 Q 180 250 180 235 L 200 170 Z" fill="url(#gt-ia-pot-grad)"/>
        <rect x="55" y="160" width="150" height="16" rx="3" fill="#9a5532"/>
        <rect x="55" y="160" width="150" height="4" fill="#6d3a20"/>
        <!-- Soil -->
        <ellipse cx="130" cy="168" rx="70" ry="10" fill="url(#gt-ia-soil-grad)"/>
        <circle class="ground-dot" cx="100" cy="167" r="2" fill="#5a3820"/>
        <circle class="ground-dot" cx="150" cy="167" r="1.6" fill="#5a3820" style="animation-delay:-1.2s"/>
        <circle class="ground-dot" cx="130" cy="165" r="2.2" fill="#4a2810" style="animation-delay:-2.4s"/>
        <!-- Plant -->
        <g class="plant-group">
          <path class="stem" d="M 130 165 Q 128 130 134 95 Q 138 75 130 50" stroke="${CROPS.tomato.stemColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <ellipse class="leaf leaf-1" cx="110" cy="135" rx="22" ry="10" fill="${CROPS.tomato.leafColor}" transform-origin="130px 135px" style="--lx:-20px"/>
          <ellipse class="leaf leaf-2" cx="150" cy="115" rx="22" ry="10" fill="${CROPS.tomato.leafColor}"/>
          <ellipse class="leaf leaf-3" cx="115" cy="95" rx="20" ry="9" fill="${CROPS.tomato.leafColor}"/>
          <ellipse class="leaf leaf-4" cx="145" cy="75" rx="18" ry="8" fill="${CROPS.tomato.leafColor}"/>
          <g class="fruit fruit-1">
            <circle cx="120" cy="125" r="8" fill="${CROPS.tomato.fruit.color}" stroke="${CROPS.tomato.fruit.stroke}" stroke-width="1"/>
            <circle cx="117" cy="122" r="2.5" fill="${CROPS.tomato.fruit.highlight}" opacity="0.8"/>
          </g>
          <g class="fruit fruit-2">
            <circle cx="143" cy="105" r="9" fill="${CROPS.tomato.fruit.color}" stroke="${CROPS.tomato.fruit.stroke}" stroke-width="1"/>
            <circle cx="140" cy="102" r="2.8" fill="${CROPS.tomato.fruit.highlight}" opacity="0.8"/>
          </g>
          <g class="fruit fruit-3">
            <circle cx="130" cy="65" r="7" fill="${CROPS.tomato.fruit.color}" stroke="${CROPS.tomato.fruit.stroke}" stroke-width="1"/>
            <circle cx="128" cy="63" r="2" fill="${CROPS.tomato.fruit.highlight}" opacity="0.8"/>
          </g>
        </g>
      </svg>
    `;
    hero.appendChild(pot);

    // Grow the initial crop shortly after load
    setTimeout(() => pot.classList.add('grown'), 600);

    // ── Crop picker (find a spot to inject) ───────────────
    const heroCopy = hero.querySelector('.hero-copy, .hero-text, .hero-content') || hero.querySelector('h1')?.parentElement || hero;
    const picker = document.createElement('div');
    picker.className = 'gt-ia-crop-picker';
    picker.setAttribute('role', 'tablist');
    picker.setAttribute('aria-label', 'Try growing different crops');
    Object.entries(CROPS).forEach(([key, crop], i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gt-ia-crop-btn' + (key === 'tomato' ? ' active' : '');
      btn.dataset.crop = key;
      btn.setAttribute('role', 'tab');
      btn.innerHTML = `<span class="emo" aria-hidden="true">${crop.emo}</span>${crop.label}`;
      btn.addEventListener('click', () => switchCrop(key, btn));
      picker.appendChild(btn);
    });

    // Try to insert after hero description/buttons
    const heroBtns = hero.querySelector('.hero-buttons, .hero-cta, .hero-actions');
    if (heroBtns && heroBtns.parentElement) {
      heroBtns.parentElement.insertBefore(picker, heroBtns.nextSibling);
    } else if (heroCopy) {
      heroCopy.appendChild(picker);
    }

    function switchCrop(cropKey, btn) {
      const crop = CROPS[cropKey];
      if (!crop) return;
      picker.querySelectorAll('.gt-ia-crop-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Re-grow: collapse first, swap colors, then re-grow
      pot.classList.remove('grown');
      const svg = pot.querySelector('svg');
      const stem = svg.querySelector('.stem');
      const leaves = svg.querySelectorAll('.leaf');
      const fruits = svg.querySelectorAll('.fruit');
      setTimeout(() => {
        stem.setAttribute('stroke', crop.stemColor);
        leaves.forEach(l => l.setAttribute('fill', crop.leafColor));
        fruits.forEach(fg => {
          const c = fg.querySelector('circle:first-child');
          const h = fg.querySelector('circle:last-child');
          if (c) {
            c.setAttribute('fill', crop.fruit.color);
            c.setAttribute('stroke', crop.fruit.stroke);
          }
          if (h) h.setAttribute('fill', crop.fruit.highlight);
        });
        pot.classList.add('grown');
      }, 380);
    }

    // ── Sun parallax on mouse move ────────────────────────
    let rafParallax = null;
    hero.addEventListener('mousemove', (e) => {
      if (tweaks.parallax === false) return;
      if (rafParallax) cancelAnimationFrame(rafParallax);
      rafParallax = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        const sun = scene.querySelector('.sun');
        if (sun) sun.style.transform = `translate(${dx * -30}px, ${dy * -20}px)`;
        // Subtle pot counter-parallax
        pot.style.transform = `translate(${dx * -10}px, ${dy * -6}px)`;
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // 3. Magnetic buttons
  // ──────────────────────────────────────────────────────────
  function initMagnetic() {
    const selectors = '.btn, .hero-learn-more, .wa-float, .btn-farmer-apply';
    document.querySelectorAll(selectors).forEach(el => {
      if (el.dataset.gtIaMagnet) return;
      el.dataset.gtIaMagnet = '1';
      el.classList.add('gt-ia-magnet');
      el.addEventListener('mousemove', e => {
        if (tweaks.motion === false) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // 4. Product cards: specular follow + quick peek
  // ──────────────────────────────────────────────────────────
  function initProductInteractions() {
    function wire() {
      document.querySelectorAll('.product-card').forEach(card => {
        // Remove any stale peek attached directly to the card (from older init)
        const stale = card.querySelector(':scope > .gt-ia-peek');
        if (stale) stale.remove();

        if (card.dataset.gtIaPeek && card.querySelector('.gt-ia-peek')) return;
        card.dataset.gtIaPeek = '1';
        card.addEventListener('mousemove', e => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
          card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        });

        // Try to determine crop name for the peek
        const titleEl = card.querySelector('.product-name, .product-title, h3, h4');
        const cropName = titleEl ? titleEl.textContent.trim() : 'Fresh produce';

        const peek = document.createElement('div');
        peek.className = 'gt-ia-peek';
        peek.innerHTML = `
          <div class="gt-ia-peek-inner">
            <div class="gt-ia-peek-title">Grow timeline · ${cropName}</div>
            <div class="gt-ia-peek-stages">
              <div class="gt-ia-peek-stage"><div class="fill"></div></div>
              <div class="gt-ia-peek-stage"><div class="fill"></div></div>
              <div class="gt-ia-peek-stage"><div class="fill"></div></div>
              <div class="gt-ia-peek-stage"><div class="fill"></div></div>
            </div>
            <div class="gt-ia-peek-legend">
              <span>Sow</span><span>Sprout</span><span>Flower</span><span>Harvest</span>
            </div>
          </div>
        `;
        // Find image/visual area to overlay on — MUST NOT be the whole card
        // (that would cover the Start Growing CTA). Fall back to the first child
        // (typically .product-img) if no explicit visual exists.
        let target = card.querySelector('.product-img, .product-image, .product-visual');
        if (!target) {
          const img = card.querySelector('img');
          target = img ? img.parentElement : null;
        }
        if (!target || target === card) target = card.firstElementChild;
        if (!target || target === card) return; // bail — no safe overlay surface
        if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
        if (getComputedStyle(target).overflow === 'visible') target.style.overflow = 'hidden';
        target.appendChild(peek);
      });
    }
    wire();
    // Rewire when dynamically-rendered cards show up
    const grid = document.getElementById('products-grid');
    if (grid) new MutationObserver(wire).observe(grid, { childList: true, subtree: true });
  }

  // ──────────────────────────────────────────────────────────
  // 5. Our Land: interactive plot map
  // ──────────────────────────────────────────────────────────
  function initLandMap() {
    const landSection = document.querySelector('.land-section, #land, [id*="land" i], [class*="land-section" i]');
    // Scope by land-card presence
    const cards = document.querySelectorAll('.land-card');
    if (!cards.length) return;

    // Add hint label once above the grid
    const grid = cards[0].parentElement;
    if (grid && !grid.previousElementSibling?.classList?.contains('gt-ia-land-hint-wrap')) {
      const hintWrap = document.createElement('div');
      hintWrap.className = 'gt-ia-land-hint-wrap';
      hintWrap.style.cssText = 'text-align:center;margin-bottom:24px;';
      hintWrap.innerHTML = '<div class="gt-ia-land-hint">Live · Click a plot to focus · Drag-hover to scan</div>';
      grid.parentElement.insertBefore(hintWrap, grid);
    }

    cards.forEach((card, i) => {
      if (card.dataset.gtIaLand) return;
      card.dataset.gtIaLand = '1';

      // Plot marker
      const marker = document.createElement('div');
      marker.className = 'gt-ia-plot-marker';
      marker.textContent = 'Plot ' + String.fromCharCode(65 + i); // A, B, C, D
      card.appendChild(marker);

      // Grid overlay
      const go = document.createElement('div');
      go.className = 'gt-ia-grid-overlay';
      const visual = card.querySelector('.land-visual, .land-image, img')?.parentElement || card;
      if (getComputedStyle(visual).position === 'static') visual.style.position = 'relative';
      visual.appendChild(go);

      // Coordinates badge — generate pseudo-geo coords around Telangana
      const lat = (17.5 + Math.random() * 1.6).toFixed(4);
      const lon = (78.2 + Math.random() * 1.6).toFixed(4);
      const coords = document.createElement('div');
      coords.className = 'gt-ia-coords';
      coords.textContent = `${lat}° N · ${lon}° E`;
      card.appendChild(coords);

      // Mouse follow for radial highlight
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });

      // Click to "focus" the plot
      card.addEventListener('click', (e) => {
        // Don't hijack links/buttons inside the card
        if (e.target.closest('a, button')) return;
        cards.forEach(c => c.classList.remove('gt-ia-focused'));
        card.classList.add('gt-ia-focused');
        setTimeout(() => card.classList.remove('gt-ia-focused'), 1400);
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  // 6. How It Works: connector line (desktop only)
  // ──────────────────────────────────────────────────────────
  function initConnectors() {
    const stepsWrap = document.querySelector('.how-steps, .how-grid, [class*="how-step"]')?.parentElement;
    if (!stepsWrap) return;
    const steps = stepsWrap.querySelectorAll('.how-step, [class*="how-step"]:not([class*="how-steps"])');
    if (steps.length < 2) return;

    if (getComputedStyle(stepsWrap).position === 'static') stepsWrap.style.position = 'relative';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'gt-ia-connector-svg show');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '<path d=""/>';
    stepsWrap.appendChild(svg);

    function update() {
      const wrapRect = stepsWrap.getBoundingClientRect();
      if (wrapRect.width < 900) { svg.classList.remove('show'); return; }
      svg.classList.add('show');
      svg.setAttribute('viewBox', `0 0 ${wrapRect.width} 80`);
      svg.setAttribute('width', wrapRect.width);
      const pts = [];
      steps.forEach(s => {
        const r = s.getBoundingClientRect();
        pts.push({ x: r.left - wrapRect.left + r.width / 2, y: 40 });
      });
      if (pts.length < 2) return;
      // Draw a smooth curve through midpoints
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i-1], cur = pts[i];
        const cx = (prev.x + cur.x) / 2;
        const dir = i % 2 === 1 ? -18 : 18;
        d += ` C ${cx} ${prev.y + dir}, ${cx} ${cur.y + dir}, ${cur.x} ${cur.y}`;
      }
      svg.querySelector('path').setAttribute('d', d);
    }
    update();
    window.addEventListener('resize', update);
  }

  // ──────────────────────────────────────────────────────────
  // 7. Cursor trail (desktop only, respects reduced motion)
  // ──────────────────────────────────────────────────────────
  function initCursorTrail() {
    if ('ontouchstart' in window) return;
    if (prefersReduced) return;
    const LEAF_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 C 7 8 5 14 5 20 C 11 20 17 18 22 13 C 19 11 15 10 12 2 Z"/></svg>`;
    let last = 0;
    let idx = 0;
    const COLORS = ['#d4a84b', '#7a9a5a', '#c2703e', '#f0d68a'];
    document.addEventListener('mousemove', (e) => {
      if (tweaks.cursor === false) return;
      const now = performance.now();
      if (now - last < 55) return;
      last = now;
      idx++;
      const leaf = document.createElement('div');
      leaf.className = 'gt-ia-trail';
      leaf.style.left = e.clientX + 'px';
      leaf.style.top  = e.clientY + 'px';
      leaf.style.color = COLORS[idx % COLORS.length];
      leaf.innerHTML = LEAF_SVG;
      const rot = (Math.random() * 360) | 0;
      const driftX = (Math.random() - 0.5) * 40;
      const driftY = 30 + Math.random() * 20;
      leaf.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${0.5 + Math.random() * 0.5})`;
      document.body.appendChild(leaf);
      leaf.animate([
        { transform: leaf.style.transform, opacity: 0.9 },
        { transform: `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) rotate(${rot + 120}deg) scale(0.3)`, opacity: 0 }
      ], { duration: 900, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }).onfinish = () => leaf.remove();
    }, { passive: true });
  }

  // ──────────────────────────────────────────────────────────
  // 8. Confetti (seeds & leaves) on CTA clicks
  // ──────────────────────────────────────────────────────────
  function burstConfetti(x, y) {
    if (tweaks.confetti === false) return;
    const COLORS = ['#d4a84b', '#7a9a5a', '#c2703e', '#f0d68a', '#3d6b4f'];
    const COUNT = 28;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'gt-ia-confetti-particle';
      const isLeaf = Math.random() > 0.5;
      const size = 8 + Math.random() * 8;
      p.style.width = size + 'px';
      p.style.height = (isLeaf ? size * 1.2 : size * 1.4) + 'px';
      p.style.left = x + 'px';
      p.style.top  = y + 'px';
      p.style.background = COLORS[i % COLORS.length];
      p.style.borderRadius = isLeaf ? '50% 50% 50% 50% / 60% 60% 40% 40%' : '50% 50% 40% 40% / 60% 60% 40% 40%';
      p.style.opacity = '1';
      document.body.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 180;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 80;
      const rot = (Math.random() * 720) - 360;
      p.animate([
        { transform: `translate(-50%, -50%) rotate(0deg)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 300}px)) rotate(${rot}deg)`, opacity: 0 }
      ], { duration: 1400 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).onfinish = () => p.remove();
    }
  }
  function initConfetti() {
    const triggers = '.btn-primary, .btn-farmer-apply, .newsletter-btn, .sg-submit-btn, .lease-submit, .hero-buttons .btn';
    document.addEventListener('click', e => {
      const t = e.target.closest(triggers);
      if (!t) return;
      // Avoid double-firing on re-clicks too fast
      if (t.dataset.gtIaBurst && performance.now() - Number(t.dataset.gtIaBurst) < 400) return;
      t.dataset.gtIaBurst = String(performance.now());
      burstConfetti(e.clientX, e.clientY);
    });
  }

  // ──────────────────────────────────────────────────────────
  // 9. CTA word rotator (optional, only if CTA title exists)
  // ──────────────────────────────────────────────────────────
  function initWordRotate() {
    const ctaTitle = document.querySelector('.cta-section h2, .cta-section .cta-title, .cta-title');
    if (!ctaTitle) return;
    // Find a word to rotate — look for "grow" / "harvest" in the title
    const html = ctaTitle.innerHTML;
    const match = html.match(/\b(Grow|Harvest|Plant|Earn)\b/);
    if (!match) return;
    const words = ['Grow', 'Harvest', 'Earn', 'Thrive', 'Plant'];
    const wrap = `<span class="gt-ia-word-rotate">${words.map((w, i) => `<span class="${i === 0 ? 'active' : ''}">${w}</span>`).join('')}</span>`;
    ctaTitle.innerHTML = html.replace(match[0], wrap);

    const spans = ctaTitle.querySelectorAll('.gt-ia-word-rotate > span');
    let cur = 0;
    setInterval(() => {
      if (tweaks.motion === false) return;
      spans[cur].classList.remove('active');
      cur = (cur + 1) % spans.length;
      spans[cur].classList.add('active');
    }, 2400);
  }

  // ──────────────────────────────────────────────────────────
  // 10. Tweaks panel UI
  // ──────────────────────────────────────────────────────────
  function initTweaksPanel() {
    const panel = document.createElement('div');
    panel.className = 'gt-ia-tweaks';
    panel.id = 'gt-ia-tweaks';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Interactive tweaks');
    const rows = [
      { k: 'motion',    label: 'Motion & animation' },
      { k: 'cursor',    label: 'Leaf cursor trail' },
      { k: 'parallax',  label: 'Hero parallax' },
      { k: 'confetti',  label: 'Seed confetti' },
      { k: 'scrollbar', label: 'Scroll progress' },
      { k: 'heroPot',   label: 'Hero grow-pot' },
    ];
    panel.innerHTML = `
      <h4>Tweaks</h4>
      ${rows.map(r => `
        <div class="gt-ia-tweak-row">
          <label for="gt-ia-sw-${r.k}">${r.label}</label>
          <button type="button" class="gt-ia-switch" id="gt-ia-sw-${r.k}" data-key="${r.k}" aria-pressed="false"></button>
        </div>
      `).join('')}
      <div class="gt-ia-tweaks-footer">Saved locally · tap toolbar to hide</div>
    `;
    document.body.appendChild(panel);

    function refresh() {
      rows.forEach(r => {
        const sw = panel.querySelector(`#gt-ia-sw-${r.k}`);
        sw.classList.toggle('on', !!tweaks[r.k]);
        sw.setAttribute('aria-pressed', tweaks[r.k] ? 'true' : 'false');
      });
    }
    refresh();

    panel.addEventListener('click', e => {
      const sw = e.target.closest('.gt-ia-switch');
      if (!sw) return;
      const key = sw.dataset.key;
      tweaks[key] = !tweaks[key];
      saveTweaks();
      refresh();
    });

    // Integrate with the host's Edit Mode toolbar toggle
    window.addEventListener('message', (evt) => {
      const d = evt.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode')   panel.classList.add('open');
      if (d.type === '__deactivate_edit_mode') panel.classList.remove('open');
    });
    // Announce we accept edit mode
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
  }

  // ──────────────────────────────────────────────────────────
  // Init sequence
  // ──────────────────────────────────────────────────────────
  function init() {
    applyTweaks();
    initScrollBar();
    initHeroScene();
    initMagnetic();
    initProductInteractions();
    initLandMap();
    initConnectors();
    initCursorTrail();
    initConfetti();
    initWordRotate();
    initTweaksPanel();

    // Re-wire magnetic on new dynamic content
    const obs = new MutationObserver(() => {
      initMagnetic();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Delay one tick so other scripts (dynamic renderers) finish
    setTimeout(init, 150);
  }
})();
