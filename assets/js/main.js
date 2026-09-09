/* =========================================================
   Marcel_899 — portfolio interactions
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------- */
  var reveals = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revObs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

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
