/* =========================================================
   Marcel_899 — portfolio interactions
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Hero night sky

     Rendered at 0.6x and upscaled by CSS, which softens it for free and cuts
     the pixel work. Meteors are one pre-rendered sprite drawn with drawImage
     rather than a fresh gradient per meteor per frame.
     --------------------------------------------------------- */
  (function () {
    var cv = $('#heroSky');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var bg = document.createElement('canvas'), bx = bg.getContext('2d');
    var SCALE = 0.5, W = 0, H = 0, meteors = [], raf = null, live = false;
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

    /* the field is painted a little larger than the canvas so it can drift */
    var PAD = 34, BW = 0, BH = 0;
    var BAND = -0.42;                       /* milky way axis, radians */

    function cloud(cx, cy, r, tint, alpha, squash, rot) {
      bx.save();
      bx.translate(cx, cy);
      bx.rotate(rot);
      bx.scale(1, squash);
      var g = bx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(' + tint + ',' + alpha + ')');
      g.addColorStop(0.55, 'rgba(' + tint + ',' + (alpha * 0.38) + ')');
      g.addColorStop(1, 'rgba(' + tint + ',0)');
      bx.fillStyle = g;
      bx.beginPath(); bx.arc(0, 0, r, 0, 6.283); bx.fill();
      bx.restore();
    }

    function paintSky() {
      BW = W + PAD * 2; BH = H + PAD * 2;
      bg.width = BW; bg.height = BH;
      bx.clearRect(0, 0, BW, BH);
      if ('filter' in bx) bx.filter = 'blur(1.5px)';

      var i, x, y, cx, cy, small = W < 300;
      var mid = { x: BW * 0.5, y: BH * 0.52 };
      var span = Math.max(BW, BH);
      var ca = Math.cos(BAND), sa = Math.sin(BAND);

      /* deep colour clouds, then a brighter core along the galactic band */
      var tints = ['84,110,200', '120,90,190', '70,130,190', '150,190,255'];
      for (i = 0; i < (small ? 7 : 11); i++) {
        var t = (Math.random() - 0.5) * span * 1.1;
        cx = mid.x + ca * t + (Math.random() - 0.5) * span * 0.34;
        cy = mid.y + sa * t + (Math.random() - 0.5) * span * 0.22;
        cloud(cx, cy, span * (0.16 + Math.random() * 0.3),
              tints[(Math.random() * tints.length) | 0],
              0.034 + Math.random() * 0.04,
              0.3 + Math.random() * 0.3, BAND);
      }
      for (i = 0; i < (small ? 3 : 5); i++) {
        var t2 = (Math.random() - 0.5) * span * 0.8;
        cloud(mid.x + ca * t2, mid.y + sa * t2 + (Math.random() - 0.5) * span * 0.06,
              span * (0.2 + Math.random() * 0.22), '176,206,255',
              0.038 + Math.random() * 0.03, 0.16 + Math.random() * 0.12, BAND);
      }

      /* stars: two thirds crowd the band, the rest scatter */
      var STAR_TINTS = ['232,242,255', '232,242,255', '206,226,255',
                        '255,236,214', '255,214,190', '198,214,255'];
      var n = Math.min(560, Math.round(BW * BH / (small ? 2200 : 1300)));
      for (i = 0; i < n; i++) {
        if (Math.random() < 0.66) {
          var d = (Math.random() + Math.random() + Math.random() - 1.5) * span * 0.14;
          var along = (Math.random() - 0.5) * span * 1.3;
          x = mid.x + ca * along - sa * d;
          y = mid.y + sa * along + ca * d;
        } else {
          x = Math.random() * BW; y = Math.random() * BH;
        }
        if (x < -8 || x > BW + 8 || y < -8 || y > BH + 8) continue;
        var rr = Math.random() * Math.random() * 1.5 + 0.25;
        var al = Math.random() * 0.75 + 0.12;
        var tint = STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0];
        if (rr > 1.0) {
          var hd = rr * 7.2;
          bx.globalAlpha = al * 0.34;
          bx.drawImage(STAR, x - hd / 2, y - hd / 2, hd, hd);
          bx.globalAlpha = 1;
        }
        bx.globalAlpha = al;
        bx.fillStyle = 'rgb(' + tint + ')';
        bx.beginPath(); bx.arc(x, y, rr, 0, 6.283); bx.fill();
        bx.globalAlpha = 1;
      }
    }

    function spawn(seed) {
      var t = Math.random();
      var far = t < 0.44, mid = !far && t < 0.78, flare = t > 0.972;
      /* each one gets its own angle: perfectly parallel streaks look mechanical */
      var ang = ANG + (Math.random() - 0.5) * 0.34;
      var m = {
        x: Math.random() * (W + 320) - 60,
        y: seed ? Math.random() * H : -(Math.random() * 200 + 20),
        len:  flare ? 230 + Math.random() * 150 : far ? 30 + Math.random() * 46 : mid ? 70 + Math.random() * 78 : 120 + Math.random() * 120,
        sp:   flare ? 6.5 + Math.random() * 3   : far ? 0.7 + Math.random() * 0.8 : mid ? 1.5 + Math.random() * 1.4 : 2.8 + Math.random() * 2.1,
        a:    flare ? 1                          : far ? 0.16 + Math.random() * 0.2 : mid ? 0.4 + Math.random() * 0.28 : 0.7 + Math.random() * 0.3,
        th:   flare ? 34                         : far ? 9 : mid ? 16 : 26,
        ca: Math.cos(ang), sa: Math.sin(ang)
      };
      m.dx = -m.ca; m.dy = -m.sa;          // travel is opposite the tail
      return m;
    }

    var twinkle = [];
    var STAR = (function () {
      var d = 18, sp = document.createElement('canvas');
      sp.width = d; sp.height = d;
      var c = sp.getContext('2d');
      var g = c.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(226,238,255,.55)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, d, d);
      return sp;
    })();

    function resize() {
      var r = cv.getBoundingClientRect();
      W = cv.width  = Math.max(1, Math.round(r.width  * SCALE));
      H = cv.height = Math.max(1, Math.round(r.height * SCALE));
      paintSky();
      var small = W < 300;
      twinkle.length = 0;
      for (var t = 0, tn = small ? 12 : 24; t < tn; t++) {
        twinkle.push({ x: Math.random() * W, y: Math.random() * H * 0.9,
                       r: Math.random() * 1.1 + 0.5,
                       p: Math.random() * 6.283,
                       s: 0.6 + Math.random() * 1.5 });
      }
      meteors.length = 0;
      var m = small ? Math.max(6, Math.round(W / 30))
                    : Math.min(24, Math.max(10, Math.round(W / 36)));
      for (var j = 0; j < m; j++) meteors.push(spawn(true));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var dt = performance.now() / 1000;
      ctx.drawImage(bg,
        -PAD + Math.sin(dt * 0.045) * PAD * 0.55,
        -PAD + Math.cos(dt * 0.032) * PAD * 0.45);
      var now = performance.now();
      for (var k = 0; k < twinkle.length; k++) {
        var w = twinkle[k], d = w.r * 7;
        ctx.globalAlpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(now / 620 * w.s + w.p));
        ctx.drawImage(STAR, w.x - d / 2, w.y - d / 2, d, d);
      }
      for (var j = 0; j < meteors.length; j++) {
        var m = meteors[j];
        /* ease in on entry and out near the bottom so none of them pop */
        var f = 1;
        if (m.y < 70) f = Math.max(0, Math.min(1, (m.y + m.len) / (m.len + 70)));
        if (m.y > H - 190) f = Math.min(f, Math.max(0, (H - m.y) / 190));
        ctx.setTransform(m.ca, m.sa, -m.sa, m.ca, m.x, m.y);
        ctx.globalAlpha = m.a * f;
        ctx.drawImage(SPR, 0, -m.th / 2, m.len, m.th);
        m.x += m.dx * m.sp; m.y += m.dy * m.sp;
        if (m.y - m.len > H + 30 || m.x + m.len < -70) meteors[j] = spawn(false);
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
    var bar    = $('#sliderBar');
    var frame  = $('#frame');
    var view   = $('#frameView');
    var urlEl  = $('#frameUrl');
    var tabsWrap = $('.slider__tabs', slider);

    var URLS = [
      'gtd.fandom.com/wiki/Garden_Tower_Defense_Wiki',
      'unbox-asmr.fandom.com/wiki/Unbox_ASMR_Wiki',
      'stream-a-cheese-pull.fandom.com/wiki/Stream_A_Cheese_Pull!_Wiki'
    ];
    var COLORS = ['#5FD647', '#A972FF', '#FFC42E'];
    var current = 0;
    var counted = {};

    function moveBar() {
      var t = tabs[current];
      if (!bar || !t) return;
      bar.style.width = t.offsetWidth + 'px';
      bar.style.transform = 'translateX(' + t.offsetLeft + 'px)';
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
      if (bar) bar.style.background = COLORS[i];
      if (urlEl) urlEl.textContent = URLS[i];

      moveBar();
      measure();

      if (!counted[i] && slider.getBoundingClientRect().top < window.innerHeight) {
        counted[i] = true;
        countUp(infos[i]);
      }
      if (focusTab) tabs[i].focus();

      /* keep the active tab in view on narrow screens */
      if (tabsWrap && tabsWrap.scrollWidth > tabsWrap.clientWidth) {
        var t = tabs[i];
        var left = t.offsetLeft - (tabsWrap.clientWidth - t.offsetWidth) / 2;
        tabsWrap.scrollTo({ left: Math.max(0, left), behavior: reduce ? 'auto' : 'smooth' });
      }
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { go(parseInt(t.dataset.i, 10)); });
    });
    $('#prev').addEventListener('click', function () { go(current - 1); });
    $('#next').addEventListener('click', function () { go(current + 1); });

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
    window.addEventListener('resize', function () { moveBar(); measure(); });
    window.addEventListener('load', function () { moveBar(); measure(); });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveBar);

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
     Gallery filters
     --------------------------------------------------------- */
  var tiles = $$('.tile');
  function shown() { return tiles.filter(function (t) { return !t.classList.contains('is-hidden'); }); }

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

  function paint() {
    var t = lbSet[lbAt];
    if (!t) return;
    lbImg.src = t.dataset.src;
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
  var toTop = $('#toTop');
  if (toTop) {
    var topTicking = false;
    function syncTop() {
      var show = window.scrollY > window.innerHeight * 0.6;
      if (show && toTop.hidden) toTop.hidden = false;
      toTop.classList.toggle('is-on', show);
      if (!show) {
        clearTimeout(toTop._t);
        toTop._t = setTimeout(function () { if (!toTop.classList.contains('is-on')) toTop.hidden = true; }, 320);
      }
      topTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!topTicking) { topTicking = true; requestAnimationFrame(syncTop); }
    }, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
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
