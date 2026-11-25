/* =========================================================
   Marcel_899 — portfolio interactions
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Hero meteors

     The sky, the moon and the landscape are vector art around this canvas,
     which sits between the sky and the mountains: it stays transparent and
     carries only the meteors, and the ridges in front of it occlude them.

     Rendered at 0.5x and upscaled by CSS, which softens it for free and cuts
     the pixel work. Meteors are one pre-rendered sprite drawn with drawImage
     rather than a fresh gradient per meteor per frame.
     --------------------------------------------------------- */
  (function () {
    var cv = $('#heroSky');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var SCALE = 0.5, W = 0, H = 0, meteors = [], raf = null, live = false;
    /* The ridgeline, measured off the landscape SVG itself: prof[x] is the
       canvas row where the silhouette begins in that column, so a meteor is
       dimmed and retired against the peak or valley it actually meets rather
       than against one flat line. Rebuilt whenever the canvas is resized. */
    var prof = null, hzMin = 0, FADE = 44;
    var DX = -0.34, DY = 0.94;
    var ANG = Math.atan2(-DY, -DX);
    var CA = Math.cos(ANG), SA = Math.sin(ANG);

    /* a tapered comet: wide soft halo, a bright core that narrows to nothing,
       and a hot head. drawn once, then blitted per meteor. */
    var SPR = (function () {
      var L = 320, TH = 34, sp = document.createElement('canvas');
      sp.width = L; sp.height = TH;
      var c = sp.getContext('2d'), cy = TH / 2, g;
      if ('filter' in c) c.filter = 'blur(1.2px)';

      g = c.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, 'rgba(150,190,255,.20)');
      g.addColorStop(0.32, 'rgba(122,166,255,.085)');
      g.addColorStop(1, 'rgba(110,150,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, cy - TH * 0.30);
      c.lineTo(L, cy - 0.5);
      c.lineTo(L, cy + 0.5);
      c.lineTo(0, cy + TH * 0.30);
      c.closePath(); c.fill();

      g = c.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.1, 'rgba(236,245,255,.88)');
      g.addColorStop(0.38, 'rgba(172,203,255,.42)');
      g.addColorStop(1, 'rgba(120,160,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, cy - TH * 0.085);
      c.lineTo(L, cy - 0.3);
      c.lineTo(L, cy + 0.3);
      c.lineTo(0, cy + TH * 0.085);
      c.closePath(); c.fill();

      g = c.createRadialGradient(3, cy, 0, 3, cy, TH * 0.36);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.38, 'rgba(222,237,255,.6)');
      g.addColorStop(1, 'rgba(190,215,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(3, cy, TH * 0.36, 0, 6.283); c.fill();
      return sp;
    })();

    function spawn(seed) {
      var t = Math.random();
      var far = t < 0.44, mid = !far && t < 0.78, flare = t > 0.972;
      /* each one gets its own angle: perfectly parallel streaks look mechanical */
      var ang = ANG + (Math.random() - 0.5) * 0.34;
      var m = {
        x: Math.random() * (W + 320) - 60,
        y: seed ? Math.random() * hzMin : -(Math.random() * 200 + 20),
        len:  flare ? 230 + Math.random() * 150 : far ? 30 + Math.random() * 46 : mid ? 70 + Math.random() * 78 : 120 + Math.random() * 120,
        sp:   flare ? 6.5 + Math.random() * 3   : far ? 0.7 + Math.random() * 0.8 : mid ? 1.5 + Math.random() * 1.4 : 2.8 + Math.random() * 2.1,
        a:    flare ? 1                          : far ? 0.16 + Math.random() * 0.2 : mid ? 0.4 + Math.random() * 0.28 : 0.7 + Math.random() * 0.3,
        th:   flare ? 34                         : far ? 9 : mid ? 16 : 26,
        ca: Math.cos(ang), sa: Math.sin(ang)
      };
      m.dx = -m.ca; m.dy = -m.sa;          // travel is opposite the tail
      return m;
    }

    /* Walk each ridge path and keep, per column, the highest point it reaches.
       getScreenCTM maps the SVG's own units to CSS pixels, which is also what
       getBoundingClientRect is in, so the two line up without knowing anything
       about the viewBox or how preserveAspectRatio sliced it. */
    function buildHorizon() {
      prof = null;
      hzMin = Math.round(H * 0.5);
      var ridges = document.querySelectorAll('.mond-ridge');
      var r = cv.getBoundingClientRect();
      if (!ridges.length || !r.width || !r.height) return;

      var sx = W / r.width, sy = H / r.height;
      var pr = new Float32Array(W), i;
      for (i = 0; i < W; i++) pr[i] = Infinity;

      for (var k = 0; k < ridges.length; k++) {
        var path = ridges[k];
        if (!path.getTotalLength) return;
        var m = path.getScreenCTM(), L = path.getTotalLength();
        if (!m || !L) return;
        var steps = Math.min(1200, Math.max(500, Math.round(L / 3)));
        for (var t = 0; t <= steps; t++) {
          var q = path.getPointAtLength(L * t / steps);
          var col = Math.floor((m.a * q.x + m.c * q.y + m.e - r.left) * sx);
          if (col < 0 || col >= W) continue;
          var row = (m.b * q.x + m.d * q.y + m.f - r.top) * sy;
          if (row < pr[col]) pr[col] = row;
        }
      }

      /* carry the nearest measured column into any the sampling stepped over */
      var last = Infinity;
      for (i = 0; i < W; i++) { if (pr[i] === Infinity) pr[i] = last; else last = pr[i]; }
      last = Infinity;
      for (i = W - 1; i >= 0; i--) { if (pr[i] === Infinity) pr[i] = last; else last = pr[i]; }

      var lo = Infinity;
      for (i = 0; i < W; i++) {
        if (!isFinite(pr[i])) pr[i] = H; else if (pr[i] < lo) lo = pr[i];
      }
      if (!isFinite(lo) || lo < 24) return;      /* nothing usable; keep the fallback */
      hzMin = lo;
      prof = pr;
    }

    function horizonAt(x) {
      if (!prof) return H;
      var i = x < 0 ? 0 : (x >= W ? W - 1 : Math.floor(x));
      return prof[i];
    }

    function resize() {
      var r = cv.getBoundingClientRect();
      W = cv.width  = Math.max(1, Math.round(r.width  * SCALE));
      H = cv.height = Math.max(1, Math.round(r.height * SCALE));
      var small = W < 300;
      buildHorizon();
      meteors.length = 0;
      /* sparse on purpose: the sky has its own motion now, and a meteor is
         only an event if you have waited a moment for it */
      var m = small ? Math.max(2, Math.round(W / 90))
                    : Math.min(9, Math.max(4, Math.round(W / 104)));
      for (var j = 0; j < m; j++) meteors.push(spawn(true));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var j = 0; j < meteors.length; j++) {
        var m = meteors[j];
        /* ease in on entry, and out as the head nears whatever the ridgeline
           does in this column, so the mountains put them out instead of
           clipping a streak in half */
        var hz = horizonAt(m.x), f = 1;
        if (m.y < 70) f = Math.max(0, Math.min(1, (m.y + m.len) / (m.len + 70)));
        if (m.y > hz - FADE) f = Math.min(f, Math.max(0, (hz - m.y) / FADE));
        ctx.setTransform(m.ca, m.sa, -m.sa, m.ca, m.x, m.y);
        ctx.globalAlpha = m.a * f;
        ctx.drawImage(SPR, 0, -m.th / 2, m.len, m.th);
        m.x += m.dx * m.sp; m.y += m.dy * m.sp;
        if (m.y > hz || m.x + m.len < -70) meteors[j] = spawn(false);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    function start() { if (!live) { live = true; raf = requestAnimationFrame(draw); } }
    function stop()  { if (live) { live = false; cancelAnimationFrame(raf); } }

    var lastW = 0, lastH = 0;
    function sync(force) {
      var r = cv.getBoundingClientRect();
      var w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h) return;
      /* On phones the URL bar collapsing fires resize mid-scroll. Repainting the
         whole star field for that is what made it stutter, so ignore height-only
         changes; object-fit:cover absorbs the difference without stretching. */
      if (w === lastW && h === lastH) return;              /* nothing moved */
      if (!force && w === lastW && Math.abs(h - lastH) < Math.max(140, lastH * 0.3)) return;
      lastW = w; lastH = h;
      resize();
    }

    sync(true);
    if (reduce) { draw(); cancelAnimationFrame(raf); live = false; return; }

    /* the hero grows when the webfonts swap in; without these the canvas keeps
       its first-paint size and gets stretched to fit */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { sync(true); });
    }
    window.addEventListener('load', function () { sync(true); }, { once: true });

    var rt;
    function onResize() { clearTimeout(rt); rt = setTimeout(sync, 200); }
    window.addEventListener('resize', onResize);
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(cv);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        e[0].isIntersecting ? start() : stop();
      }, { threshold: 0 }).observe(cv);
    } else { start(); }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  })();

  /* ---------------------------------------------------------
     Project slider
     --------------------------------------------------------- */
  var slider = $('#slider');

  if (slider) {
    var tabs   = $$('.ptab', slider);
    var infos  = $$('.pinfo', slider);
    var shots  = $$('.shot', slider);
    var frame  = $('#frame');
    var view   = $('#frameView');
    var urlEl  = $('#frameUrl');
    var tabsWrap = $('.slider__tabs', slider);

    var URLS = [
      'gtd.fandom.com/wiki/Garden_Tower_Defense_Wiki',
      'unbox-asmr.fandom.com/wiki/Unbox_ASMR_Wiki',
      'stream-a-cheese-pull.fandom.com/wiki/Stream_A_Cheese_Pull!_Wiki',
      'defend-your-treehouse.fandom.com/wiki/Defend_Your_Treehouse_Wiki',
      'galaxyvalues.xyz',
      'bloombot-gtd.vercel.app'
    ];
    var COLORS = ['#5FD647', '#A972FF', '#FFC42E', '#FF6A5A', '#E066FF', '#FF7BC5'];
    var current = 0;
    var counted = {};

    /* the pager under the frame: previous and next by name, a dot per
       project, and where you are */
    /* read before the press effects add their own spans to each tab */
    var NAMES = tabs.map(function (t) { return t.textContent.replace(/\s+/g, ' ').trim(); });
    var pgPrev = $('#pgPrev'), pgNext = $('#pgNext');
    var pgPrevName = $('#pgPrevName'), pgNextName = $('#pgNextName'), pgCount = $('#pgCount');
    var pgPrevIcon = $('#pgPrevIcon'), pgNextIcon = $('#pgNextIcon');
    var ICONS = tabs.map(function (t) { var im = $('img', t); return im ? im.getAttribute('src') : ''; });
    var dots = $$('.pager__dot', slider);
    function syncPager() {
      var n = tabs.length;
      var p = (current - 1 + n) % n, q = (current + 1) % n;
      if (pgPrevName) pgPrevName.textContent = NAMES[p];
      if (pgNextName) pgNextName.textContent = NAMES[q];
      if (pgPrevIcon) pgPrevIcon.src = ICONS[p];
      if (pgNextIcon) pgNextIcon.src = ICONS[q];
      if (pgPrev) pgPrev.setAttribute('aria-label', 'Previous project: ' + NAMES[p]);
      if (pgNext) pgNext.setAttribute('aria-label', 'Next project: ' + NAMES[q]);
      if (pgCount) pgCount.textContent = (current + 1) + ' / ' + n;
      dots.forEach(function (d, k) {
        d.classList.toggle('is-on', k === current);
        if (k === current) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }

    /* hover-scroll distance for the active screenshot */
    function measure() {
      if (!frame || !view) return;
      var img = shots[current];
      if (!img || !img.complete || !img.naturalWidth) { frame.style.setProperty('--shift', '0px'); return; }
      var h = view.clientWidth * (img.naturalHeight / img.naturalWidth);
      var over = h - view.clientHeight;
      frame.style.setProperty('--shift', (over > 24 ? -Math.round(over) : 0) + 'px');
    }

    /* count-up on the numeric stats */
    function countUp(panel) {
      $$('dd[data-num]', panel).forEach(function (dd) {
        var target = parseInt(dd.getAttribute('data-num'), 10);
        if (isNaN(target) || reduce) return;
        var dur = 900, t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          dd.textContent = Math.round(target * eased).toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(step);
        }
        dd.textContent = '0';
        requestAnimationFrame(step);
      });
    }

    function go(i, focusTab) {
      i = (i + tabs.length) % tabs.length;
      current = i;

      tabs.forEach(function (t, n) {
        var on = n === i;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });

      infos.forEach(function (p, n) {
        if (n === i) {
          p.hidden = false;
          p.classList.add('is-on');
          p.classList.remove('is-anim');
          void p.offsetWidth;
          if (!reduce) p.classList.add('is-anim');
        } else {
          p.hidden = true;
          p.classList.remove('is-on', 'is-anim');
        }
      });

      shots.forEach(function (s, n) { s.classList.toggle('is-on', n === i); });

      slider.style.setProperty('--pc', COLORS[i]);
      if (urlEl) urlEl.textContent = URLS[i];

      syncPager();
      measure();

      if (!counted[i] && slider.getBoundingClientRect().top < window.innerHeight) {
        counted[i] = true;
        countUp(infos[i]);
      }
      if (focusTab) tabs[i].focus();
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { go(parseInt(t.dataset.i, 10)); });
    });
    $('#prev').addEventListener('click', function () { go(current - 1); });
    $('#next').addEventListener('click', function () { go(current + 1); });
    if (pgPrev) pgPrev.addEventListener('click', function () { go(current - 1); });
    if (pgNext) pgNext.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (d) {
      d.addEventListener('click', function () { go(parseInt(d.dataset.i, 10)); });
    });

    /* roving tablist keys */
    tabsWrap.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1, true); }
      else if (e.key === 'Home') { e.preventDefault(); go(0, true); }
      else if (e.key === 'End') { e.preventDefault(); go(tabs.length - 1, true); }
    });

    /* global arrows while the slider is on screen */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (lbOpen) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if (tabsWrap.contains(e.target)) return;
      var r = slider.getBoundingClientRect();
      var seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (seen < window.innerHeight * 0.35) return;
      e.preventDefault();
      go(current + (e.key === 'ArrowRight' ? 1 : -1));
    });

    /* swipe / drag */
    var sx = 0, sy = 0, dragging = false;
    frame.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.frame__nav')) return;
      dragging = true; sx = e.clientX; sy = e.clientY;
    });
    frame.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) go(current + (dx < 0 ? 1 : -1));
    });
    frame.addEventListener('pointercancel', function () { dragging = false; });

    shots.forEach(function (img) {
      if (img.complete) return;
      img.addEventListener('load', measure, { once: true });
    });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    /* first count-up when the slider scrolls into view */
    if ('IntersectionObserver' in window) {
      var cObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !counted[current]) { counted[current] = true; countUp(infos[current]); cObs.disconnect(); }
        });
      }, { threshold: 0.2 });
      cObs.observe(slider);
    }

    go(0);
  }

  /* ---------------------------------------------------------
     Gallery: ten up front, the rest behind "+N more"
     --------------------------------------------------------- */
  var tiles = $$('.tile:not(.tile--more)');
  /* the lightbox walks every screen, folded away or not */
  function shown() { return tiles; }

  var galGrid = $('#galGrid'), galMore = $('#galMore'), galLess = $('#galLess');
  $$('.tile--extra').forEach(function (t, n) { t.style.setProperty('--n', n); });
  if (galGrid && galMore) {
    galMore.addEventListener('click', function () {
      galGrid.classList.add('is-open');
      galMore.setAttribute('aria-expanded', 'true');
      if (galLess) galLess.hidden = false;
      /* keyboard users land on the first screen that just appeared */
      var first = $('.tile--extra', galGrid);
      if (first) first.focus({ preventScroll: true });
    });
  }
  if (galGrid && galLess) {
    galLess.addEventListener('click', function () {
      galGrid.classList.remove('is-open');
      if (galMore) { galMore.setAttribute('aria-expanded', 'false'); galMore.focus({ preventScroll: true }); }
      galLess.hidden = true;
      /* the page just got shorter under the reader: bring the gallery back */
      var g = $('#gallery');
      if (g && g.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: g.getBoundingClientRect().top + window.scrollY - 20, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

  /* fade each screenshot in once it has actually arrived (styles.css keeps
     the tile shimmering until then). Images that loaded before this ran are
     marked in the same frame the class goes on, so nothing flashes. */
  document.documentElement.classList.add('js');
  tiles.forEach(function (t) {
    var img = $('img', t);
    if (!img) return;
    function ready() { img.classList.add('is-loaded'); t.classList.add('is-ready'); }
    if (img.complete && img.naturalWidth) ready();
    else {
      img.addEventListener('load', ready, { once: true });
      img.addEventListener('error', ready, { once: true });
    }
  });

  /* ---------------------------------------------------------
     Lightbox
     --------------------------------------------------------- */
  var lb = $('#lb');
  var lbImg = $('#lbImg');
  var lbTitle = $('#lbTitle');
  var lbDesc = $('#lbDesc');
  var lbCat = $('#lbCat');
  var lbCount = $('#lbCount');
  var lbWrap = $('.lb__imgwrap');
  var lbOpen = false;
  var lbSet = [];
  var lbAt = 0;
  var lastFocus = null;

  var warmed = {};
  function warm(t) {                      /* fetch a neighbour before it is asked for */
    if (!t || warmed[t.dataset.src]) return;
    warmed[t.dataset.src] = true;
    var im = new Image(); im.decoding = 'async'; im.src = t.dataset.src;
  }
  lbImg.addEventListener('load', function () { if (lbWrap) lbWrap.classList.remove('is-loading'); });
  lbImg.addEventListener('error', function () { if (lbWrap) lbWrap.classList.remove('is-loading'); });

  function paint() {
    var t = lbSet[lbAt];
    if (!t) return;
    var src = t.dataset.src;
    if (lbWrap && lbImg.getAttribute('src') !== src) lbWrap.classList.add('is-loading');
    lbImg.src = src;
    if (lbImg.complete && lbImg.naturalWidth && lbWrap) lbWrap.classList.remove('is-loading');
    warm(lbSet[(lbAt + 1) % lbSet.length]);
    warm(lbSet[(lbAt - 1 + lbSet.length) % lbSet.length]);
    lbImg.alt = t.dataset.title + ' — ' + t.dataset.desc;
    lbTitle.textContent = t.dataset.title;
    lbDesc.textContent = t.dataset.desc;
    lbCat.textContent = t.dataset.cat;
    lbCount.textContent = (lbAt + 1) + ' / ' + lbSet.length;
    if (lbWrap) lbWrap.scrollTop = 0;
  }
  function openLb(tile) {
    lbSet = shown();
    lbAt = lbSet.indexOf(tile);
    if (lbAt < 0) return;
    lastFocus = document.activeElement;
    lb.hidden = false;
    lbOpen = true;
    document.body.classList.add('is-locked');
    paint();
    $('#lbClose').focus();
  }
  function closeLb() {
    lb.hidden = true;
    lbOpen = false;
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }
  function step(d) {
    if (!lbSet.length) return;
    lbAt = (lbAt + d + lbSet.length) % lbSet.length;
    paint();
  }

  tiles.forEach(function (t) { t.addEventListener('click', function () { openLb(t); }); });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function () { step(-1); });
  $('#lbNext').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb__fig')) closeLb();
  });

  document.addEventListener('keydown', function (e) {
    if (!lbOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Tab') {
      var f = $$('button', lb);
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* lightbox swipe */
  var lsx = 0, ldrag = false;
  lb.addEventListener('pointerdown', function (e) { ldrag = true; lsx = e.clientX; });
  lb.addEventListener('pointerup', function (e) {
    if (!ldrag) return;
    ldrag = false;
    var dx = e.clientX - lsx;
    if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
  });

  /* ---------------------------------------------------------
     Back to top
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     Weld press feel

     CSS does the travel (lift, sink, spring back). This adds what CSS can't:
     a ripple from the exact point you pressed, a ring that leaves the button
     as it springs back, a light streak layer for the hover sweep, and a tick
     of vibration on phones. The pressed state is also set from pointer
     events, because iOS doesn't reliably apply :active to links.
     --------------------------------------------------------- */
  $$('a.weld, button.weld').forEach(function (w) {
    /* .weld__hit keeps the hover area steady while the button moves;
       .weld__fx clips the streak and the ripples to the face */
    var hit = document.createElement('span');
    hit.className = 'weld__hit';
    hit.setAttribute('aria-hidden', 'true');
    var fx = document.createElement('span');
    fx.className = 'weld__fx';
    fx.setAttribute('aria-hidden', 'true');
    var shine = document.createElement('span');
    shine.className = 'weld__shine';
    fx.appendChild(shine);
    w.insertBefore(fx, w.firstChild);
    w.insertBefore(hit, w.firstChild);

    var down = false;
    function press(x, y) {
      down = true;
      w.classList.add('is-pressed');
      if (reduce) return;
      var r = w.getBoundingClientRect();
      var px = (x == null ? r.left + r.width / 2 : x) - r.left - w.clientLeft;
      var py = (y == null ? r.top + r.height / 2 : y) - r.top - w.clientTop;
      /* big enough to reach the farthest corner from where it started */
      var d = 2 * Math.sqrt(Math.pow(Math.max(px, r.width - px), 2) + Math.pow(Math.max(py, r.height - py), 2));
      var rp = document.createElement('span');
      rp.className = 'weld__ripple';
      rp.setAttribute('aria-hidden', 'true');
      rp.style.cssText = 'left:' + px + 'px;top:' + py + 'px;--d:' + Math.round(d) + 'px';
      fx.appendChild(rp);
      rp.addEventListener('animationend', function () { rp.remove(); });
    }
    function release(fire) {
      if (!down) return;
      down = false;
      w.classList.remove('is-pressed');
      if (fire && !reduce) {
        w.classList.remove('is-ring');
        void w.offsetWidth;                     /* restart the ring if it is mid-flight */
        w.classList.add('is-ring');
      }
    }

    w.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      press(e.clientX, e.clientY);
      if (e.pointerType === 'touch' && navigator.vibrate && !reduce) {
        try { navigator.vibrate(8); } catch (err) { /* not allowed yet */ }
      }
    });
    w.addEventListener('pointerup', function () { release(true); });
    w.addEventListener('pointerleave', function () { release(false); });
    w.addEventListener('pointercancel', function () { release(false); });
    w.addEventListener('animationend', function (e) {
      if (e.animationName === 'weldRing') w.classList.remove('is-ring');
    });
    w.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        press();
        setTimeout(function () { release(true); }, 170);
      }
    });
  });

  /* The button used to pop in with no fade (unhidden and switched on in the
     same frame, so there was nothing to transition from), stayed clickable
     while fading out, and fought the hover lift mid-scroll. Now it is
     unhidden first and switched on a frame later, and only one hide timer is
     ever pending. */
  var toTop = $('#toTop');
  if (toTop) {
    var topTicking = false, topOn = false, hideT = 0;
    function setTop(on) {
      if (on === topOn) return;
      topOn = on;
      clearTimeout(hideT);
      if (on) {
        toTop.hidden = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { if (topOn) toTop.classList.add('is-on'); });
        });
      } else {
        toTop.classList.remove('is-on');
        if (toTop === document.activeElement) toTop.blur();
        hideT = setTimeout(function () { if (!topOn) toTop.hidden = true; }, 340);
      }
    }
    function syncTop() {
      topTicking = false;
      setTop(window.scrollY > Math.min(600, window.innerHeight * 0.6));
    }
    window.addEventListener('scroll', function () {
      if (!topTicking) { topTicking = true; requestAnimationFrame(syncTop); }
    }, { passive: true });
    window.addEventListener('resize', syncTop);
    toTop.addEventListener('animationend', function (e) {
      if (e.animationName === 'totopLaunch') toTop.classList.remove('is-launch');
    });
    toTop.addEventListener('click', function () {
      if (!reduce) {
        toTop.classList.remove('is-launch');
        void toTop.offsetWidth;
        toTop.classList.add('is-launch');
      }
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var hero = $('.hero__name');
      if (hero) { hero.setAttribute('tabindex', '-1'); hero.focus({ preventScroll: true }); }
    });
    syncTop();
  }

  /* ---------------------------------------------------------
     Copy the Discord handle
     --------------------------------------------------------- */
  function legacyCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
  }

  $$('.copy').forEach(function (btn) {
    var timer;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      var done = function () {
        btn.classList.add('is-copied');
        clearTimeout(timer);
        timer = setTimeout(function () { btn.classList.remove('is-copied'); }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
      } else {
        legacyCopy(text, done);
      }
    });
  });

  /* ---------------------------------------------------------
     Bloombot stats disclosure
     --------------------------------------------------------- */
  (function () {
    var btn = document.querySelector('.botstats__toggle');
    if (!btn) return;
    var box = btn.closest('.botstats');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      box.classList.toggle('is-open', open);
    });
  })();

  /* ---------------------------------------------------------
     Smooth anchor scroll
     --------------------------------------------------------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - 28;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });
})();
