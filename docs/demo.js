/* PlainPaper static demo for GitHub Pages: vanilla JS, no build step, relative URLs only. */
(function () {
  'use strict';

  var D = window.PP_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileQuery = window.matchMedia('(max-width: 899px)');
  var reduced = function () { return reducedQuery.matches; };
  var inr = function (n) { return Math.round(n).toLocaleString('en-IN'); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var state = { view: 'upload', lang: 'en', regime: 'new', pinned: false, payVisited: false };

  /* ------------------------------------------------------------------
     Spring: one damped harmonic oscillator, re-targetable mid-flight.
     Used for numbers, bars, sheet, toggles, tilt and toasts.
     ------------------------------------------------------------------ */
  function Spring(x, o) {
    this.x = x; this.v = 0; this.target = x;
    this.k = o.k || 170; this.c = o.c || 20; this.m = o.m || 1; this.eps = o.eps || 0.01;
    this.onUpdate = o.onUpdate; this.onRest = null; this.raf = 0;
    this.tick = this.tick.bind(this);
  }
  Spring.prototype.to = function (t, v, onRest) {
    this.target = t; this.onRest = onRest || null;
    if (typeof v === 'number') this.v = v;
    if (reduced()) { this.jump(t); return; }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  };
  Spring.prototype.jump = function (t) {
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.x = this.target = t; this.v = 0; this.onUpdate(t);
    var cb = this.onRest; this.onRest = null; if (cb) cb();
  };
  Spring.prototype.tick = function (now) {
    var dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    var n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (var i = 0; i < n; i++) {
      var a = (-this.k * (this.x - this.target) - this.c * this.v) / this.m;
      this.v += a * h; this.x += this.v * h;
    }
    if (Math.abs(this.v) < this.eps * 10 && Math.abs(this.x - this.target) < this.eps) {
      this.raf = 0; this.x = this.target; this.v = 0; this.onUpdate(this.x);
      var cb = this.onRest; this.onRest = null; if (cb) cb();
      return;
    }
    this.onUpdate(this.x);
    this.raf = requestAnimationFrame(this.tick);
  };

  /* ------------------------------------------------------------------ toasts */
  var ICONS = {
    ok: '<path d="M5 12.5 10 17l9-10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    error: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>'
  };
  function toast(msg, opts) {
    opts = opts || {};
    var type = opts.type || 'ok';
    var wrap = $('#toasts');
    while (wrap.children.length > 2) wrap.firstElementChild.remove();
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' is-error' : '');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = '<svg class="toast-icon" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[type] + '</svg><span class="toast-msg"></span>';
    $('.toast-msg', el).textContent = msg;
    if (opts.action) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'toast-action'; b.textContent = opts.action.label;
      b.addEventListener('click', function () { opts.action.fn(); dismiss(0); });
      el.appendChild(b);
    }
    wrap.appendChild(el);

    var y = 0, x = 0;
    var paint = function () { el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; el.style.opacity = String(Math.max(0, 1 - Math.abs(x) / 260)); };
    var sy = new Spring(28, { k: 420, c: 30, eps: 0.2, onUpdate: function (v) { y = v; paint(); } });
    var sx = new Spring(0, { k: 300, c: 28, eps: 0.5, onUpdate: function (v) { x = v; paint(); } });
    sy.onUpdate(28); sy.to(0);

    var timer = setTimeout(function () { dismiss(0); }, opts.duration || 4600);
    function dismiss(dir) {
      clearTimeout(timer);
      if (!el.isConnected) return;
      if (dir) { sx.to(dir * 420, undefined, function () { el.remove(); }); return; }
      el.style.transition = 'opacity 160ms ease, transform 160ms ease';
      el.style.opacity = '0'; el.style.transform = 'translate(' + x + 'px, 8px)';
      setTimeout(function () { el.remove(); }, 170);
    }

    // flick to dismiss
    var startX = 0, lastX = 0, lastT = 0, vel = 0, dragging = false;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      dragging = true; startX = e.clientX - x; lastX = e.clientX; lastT = performance.now();
      clearTimeout(timer); el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT) * 1000; lastX = e.clientX; lastT = now;
      x = e.clientX - startX; sx.x = x; paint();
    });
    el.addEventListener('pointerup', function () {
      if (!dragging) return; dragging = false;
      if (Math.abs(x) > 90 || Math.abs(vel) > 700) dismiss(x + vel * 0.1 > 0 ? 1 : -1);
      else { sx.to(0, vel); timer = setTimeout(function () { dismiss(0); }, 3000); }
    });
  }

  /* ------------------------------------------------------------------ theme */
  function initTheme() {
    var btn = $('#themeToggle');
    var isDark = function () {
      var t = document.documentElement.dataset.theme;
      return t === 'dark';
    };
    var sync = function () { btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode'); };
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('pp-theme', next);
      sync();
    });
    sync();
  }

  /* ------------------------------------------------------------------ router */
  var DOC_VIEWS = { read: 1, pay: 1, compare: 1 };
  var loadingTimers = [];
  function go(name) {
    if (!$('[data-view="' + name + '"]')) name = 'upload';
    stopSpeech();
    loadingTimers.forEach(clearTimeout); loadingTimers = [];
    state.view = name;
    $$('.view').forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $('#docbar').hidden = !DOC_VIEWS[name];
    $$('.concept-nav [data-go], .doc-tabs [data-go]').forEach(function (b) {
      if (b.dataset.go === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    history.replaceState(null, '', '#' + name);
    window.scrollTo(0, 0);
    $('#main').focus({ preventScroll: true });
    if (name === 'loading') runLoading();
    if (name === 'read') enterRead();
    if (name === 'pay') enterPay();
    if (name === 'compare') renderCompare();
    if (name === 'upload') heroMark();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go]');
    if (!t) return;
    e.preventDefault();
    go(t.dataset.go);
  });

  /* ------------------------------------------------------------------ 1. landing */
  function heroMark() {
    var m = $('#heroMark');
    m.classList.remove('is-on');
    setTimeout(function () { m.classList.add('is-on'); }, reduced() ? 0 : 380);
  }

  function initTilt() {
    var zone = $('.land-drop'), drop = $('#drop');
    var rx = 0, ry = 0, lift = 0;
    var paint = function () {
      drop.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      drop.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      drop.style.setProperty('--lift', lift.toFixed(2) + 'px');
    };
    var sRx = new Spring(0, { k: 120, c: 14, eps: 0.01, onUpdate: function (v) { rx = v; paint(); } });
    var sRy = new Spring(0, { k: 120, c: 14, eps: 0.01, onUpdate: function (v) { ry = v; paint(); } });
    var sL = new Spring(0, { k: 260, c: 18, eps: 0.05, onUpdate: function (v) { lift = v; paint(); } });
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

    zone.addEventListener('pointermove', function (e) {
      if (!fine.matches || reduced()) return;
      var r = drop.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      sRy.to(px * 7); sRx.to(-py * 5); sL.to(6);
    });
    zone.addEventListener('pointerleave', function () { sRx.to(0); sRy.to(0); sL.to(0); });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); sL.to(14); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); sL.to(0, -200); });
    });
    drop.addEventListener('drop', function (e) { handleFiles(e.dataTransfer.files); });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });
  }

  var OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
  function handleFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    var bad = files.filter(function (f) { return OK_TYPES.indexOf(f.type) === -1; });
    if (bad.length) { toast('“' + bad[0].name + '” isn’t a PDF or photo. Try a PDF, JPG or PNG.', { type: 'error' }); return; }
    if (files.length > 10) { toast('That’s ' + files.length + ' files. Up to 10 pages at a time, please.', { type: 'error' }); return; }
    var big = files.filter(function (f) { return f.size > 20 * 1024 * 1024; });
    if (big.length) { toast('“' + big[0].name + '” is over 20 MB. A phone photo or a smaller PDF works best.', { type: 'error' }); return; }
    $('#confirmFile').textContent = (files.length === 1 ? files[0].name : files.length + ' photos') + ' · this static demo shows the fictional sample letter';
    go('confirm');
  }
  $('#fileInput').addEventListener('change', function (e) { handleFiles(e.target.files); e.target.value = ''; });

  /* ------------------------------------------------------------------ 2–3. confirm, loading */
  $('#confirmGo').addEventListener('click', function () {
    var t = $('input[name="dtype"]:checked').value;
    if (t !== 'offer') { toast('This static demo only has the fictional offer letter. Showing that.', { type: 'info' }); }
    go('loading');
  });

  function runLoading() {
    var steps = $$('#steps li');
    steps.forEach(function (s) { s.className = ''; });
    var plan = [[0, 0, 'is-active'], [900, 0, 'is-done'], [900, 1, 'is-active'], [1800, 1, 'is-done'], [1800, 2, 'is-active'], [2600, 2, 'is-done']];
    plan.forEach(function (p) {
      loadingTimers.push(setTimeout(function () { steps[p[1]].className = p[2]; }, p[0]));
    });
    loadingTimers.push(setTimeout(function () {
      go('read');
      toast('Your file has been deleted. This plain reading is kept until 15 Dec 2026.', {
        action: { label: 'Pin it', fn: function () { setPinned(true); } }, duration: 6000
      });
    }, 2900));
  }

  /* ------------------------------------------------------------------ 4. document */
  function renderDoc() {
    var html = D.pages.map(function (pg) {
      var out = '<article class="page" aria-label="Page ' + pg.n + ' of 2" data-page="' + pg.n + '">';
      if (pg.head) {
        out += '<header class="lh"><div class="lh-name">Northwind Fictional Pvt Ltd</div>' +
          '<div class="lh-addr">4th Floor, Example Tech Park, Bengaluru · a fictional company made up for this sample</div></header>' +
          '<div class="meta"><span>Ref: NWF/HR/2026/0417</span><span>10 November 2026</span></div>' +
          '<p class="to">To,<br>A. Student<br>Hostel Block C, Example Institute of Technology</p>' +
          '<p class="subj">Subject: Offer of appointment — Graduate Engineer Trainee</p>' +
          '<p>Dear A. Student,</p><p>We are pleased to offer you employment with Northwind Fictional Pvt Ltd (“the Company”) on the following terms and conditions.</p>';
      }
      pg.clauses.forEach(function (c) {
        out += '<div class="clause" id="' + c.id + '" data-ref="' + c.id + '"><p>' +
          '<button type="button" class="clause-num" aria-label="Show the plain version of clause ' + c.num + '">' + c.num + '.</button> ' +
          '<span class="hl"><span class="clause-title">' + esc(c.title) + '.</span> ' + esc(c.text) + '</span></p></div>';
        out += notesFor(c.id);
      });
      if (pg.annex) {
        var a = pg.annex;
        out += '<div class="clause annex" id="' + a.id + '" data-ref="' + a.id + '"><h3>' + esc(a.title) + '</h3><table><tbody>' +
          a.rows.map(function (r) {
            return '<tr class="annex-row" id="' + r.id + '" data-ref="' + r.id + '"><td><span class="hl">' + esc(r.k) + '</span></td><td><span class="hl">' + r.v + '</span></td></tr>';
          }).join('') +
          '<tr class="total"><td>Total Cost to Company</td><td>' + a.total + '</td></tr></tbody></table></div>';
        a.rows.forEach(function (r) { out += notesFor(r.id); });
        out += '<div class="sign"><span>For Northwind Fictional Pvt Ltd<br>Head, Human Resources</span><span>Accepted by<br>A. Student</span></div>';
      }
      return out + '<p class="page-foot">Page ' + pg.n + ' of 2</p></article>';
    }).join('');
    $('#docInner').innerHTML = html;
  }

  var noteIndex = 0;
  function notesFor(ref) {
    return D.flags.filter(function (f) { return f.ref === ref; }).map(function (f) {
      var L = state.lang, u = D.ui[L];
      return '<aside class="note sev-' + f.sev + '" id="note-' + f.id + '" data-flag="' + f.id + '" data-for="' + f.ref + '" lang="' + L + '" style="--i:' + (noteIndex++) + '">' +
        '<button type="button" class="note-btn" aria-expanded="false" aria-controls="nb-' + f.id + '">' +
        '<span class="note-sev">' + u[f.sev] + '</span><span class="note-title">' + esc(f.title[L]) + '</span>' +
        '<span class="note-more">' + u.why + ' · ' + u.toAsk + '</span></button>' +
        '<div class="note-body" id="nb-' + f.id + '"><div><h4>' + u.why + '</h4><p>' + esc(f.why[L]) + '</p>' +
        '<h4>' + u.toAsk + '</h4><ul>' + f.ask[L].map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul></div></div></aside>';
    }).join('');
  }

  /* margin notes sit beside their clause; collisions push later notes down */
  function layoutNotes() {
    $$('.page').forEach(function (page) {
      var notes = $$('.note', page);
      if (!notes.length) return;
      var wide = getComputedStyle(notes[0]).position === 'absolute';
      var pr = page.getBoundingClientRect(), floor = 0;
      notes.forEach(function (n) {
        if (!wide) { n.style.top = ''; return; }
        var target = document.getElementById(n.dataset.for);
        var top = target.getBoundingClientRect().top - pr.top;
        top = Math.max(top, floor);
        n.style.top = top + 'px';
        floor = top + n.offsetHeight + 12;
      });
    });
  }

  /* ------------------------------------------------------------------ plain panel */
  var SRC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  function srcBtn(ref) {
    return '<button type="button" class="src" data-src="' + ref + '" aria-label="Show in the original: ' + D.src[ref] + '">' + SRC_ICON + D.src[ref] + '</button>';
  }
  function renderPlain() {
    var L = state.lang, u = D.ui[L];
    var keep = state.pinned ? { en: 'Pinned. Kept until you delete it.', hi: 'पिन किया गया। जब तक आप न हटाएँ, रखा रहेगा।', ta: 'பின் செய்யப்பட்டது. நீங்கள் நீக்கும் வரை வைக்கப்படும்.' }[L] : u.keep;
    var asks = [];
    D.flags.forEach(function (f) { asks = asks.concat(f.ask[L]); });

    var h = '<div class="plain" lang="' + L + '">' +
      '<h2>' + u.short + '</h2>' +
      '<p class="summary" lang="' + L + '" id="summaryText">' + D.summary[L] + '</p>' +
      '<p class="keep"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>' + keep + '</p>' +
      '<h2>' + u.facts + '</h2><ul class="facts">' +
      D.fields.map(function (f) {
        var dot = f.flag ? '<span class="flag-dot ' + (f.flag === 'red' ? 'red' : '') + '" aria-hidden="true"></span>' : '';
        return '<li class="fact" id="fact-' + f.key + '" data-ref="' + f.ref + '"><span class="fact-label">' + esc(f.label[L]) + '</span>' +
          '<span class="fact-value">' + dot + esc(f.value[L]) + '</span>' + srcBtn(f.ref) + '</li>';
      }).join('') + '</ul>' +
      '<h2>' + u.watch + ' · ' + D.flags.length + ' ' + u.things + '</h2><ul class="flags">' +
      D.flags.map(function (f) {
        return '<li class="flag sev-' + f.sev + '" id="pf-' + f.id + '" data-ref="' + f.ref + '">' +
          '<button type="button" class="flag-btn" aria-expanded="false" aria-controls="pfb-' + f.id + '">' +
          '<span class="flag-sev">' + u[f.sev] + '</span><span class="flag-title">' + esc(f.title[L]) + '</span>' +
          '<svg class="flag-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
          '<div class="note-body" id="pfb-' + f.id + '"><div>' +
          '<h4>' + u.quote + '</h4><blockquote lang="en">' + esc(f.quote) + '</blockquote>' +
          '<h4>' + u.why + '</h4><p>' + esc(f.why[L]) + '</p>' +
          '<h4>' + u.toAsk + '</h4><ul>' + f.ask[L].map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>' +
          srcBtn(f.ref) + '</div></div></li>';
      }).join('') + '</ul>' +
      '<h2>' + u.ask + '</h2><ol class="asks">' + asks.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' +
      '<div class="asks-actions"><button type="button" class="btn btn-small btn-quiet" id="copyAsks">' + u.copy + '</button></div>' +
      '<div class="not-advice" lang="en"><strong>This is not legal or financial advice.</strong> PlainPaper explains what the document says. If something worries you, ask the company in writing before you sign, or talk to someone you trust who knows employment law.</div>' +
      '</div>';
    $('#plainContent').innerHTML = h;
  }

  /* highlight a clause in the original with a pen pass */
  var lastLit = null;
  function litClause(ref) {
    var el = document.getElementById(ref);
    if (!el) return;
    if (lastLit) lastLit.classList.remove('is-lit');
    void el.offsetWidth;
    el.classList.add('is-lit');
    lastLit = el;
  }
  function showInOriginal(ref) {
    var el = document.getElementById(ref);
    if (!el) return;
    var scroller = $('#docScroll');
    if (lastLit) lastLit.classList.remove('is-lit');
    var run = function () {
      var top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 72;
      var dist = Math.abs(scroller.scrollTop - top);
      scroller.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
      afterScroll(scroller, dist, function () {
        litClause(ref);
        var focusable = $('.clause-num', el) || el;
        if (focusable.focus) focusable.focus({ preventScroll: true });
      });
    };
    if (mobileQuery.matches && sheet.pos() !== 'half' && sheet.pos() !== 'full') sheet.snap('half', run);
    else run();
  }
  function afterScroll(el, dist, cb) {
    if (dist < 4 || reduced()) { cb(); return; }
    var done = false;
    var fin = function () { if (done) return; done = true; el.removeEventListener('scrollend', fin); cb(); };
    el.addEventListener('scrollend', fin);
    setTimeout(fin, 520);
  }

  /* original → plain */
  function showInPlain(ref) {
    var target = $('.fact[data-ref="' + ref + '"]') || $('.flag[data-ref="' + ref + '"]');
    if (!target && ref.indexOf('cA-') === 0) target = $('.fact[data-ref="cA"]');
    litClause(ref);
    if (!target) {
      var num = ref.replace('c', '');
      toast('Clause ' + num + ' is standard wording. Nothing here needs your attention.', { type: 'info' });
      return;
    }
    var flash = function () {
      target.classList.remove('is-lit'); void target.offsetWidth; target.classList.add('is-lit');
      setTimeout(function () { target.classList.remove('is-lit'); }, 1400);
    };
    if (mobileQuery.matches) {
      sheet.snap('peek');
      var offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) + $('#docbar').offsetHeight + 72;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: reduced() ? 'auto' : 'smooth' });
      setTimeout(flash, reduced() ? 0 : 300);
    } else {
      var pane = $('#plainPane');
      pane.scrollTo({ top: target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 80, behavior: reduced() ? 'auto' : 'smooth' });
      setTimeout(flash, reduced() ? 0 : 260);
    }
  }

  function toggleOpen(item, btn, open) {
    var next = typeof open === 'boolean' ? open : btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(next));
    item.classList.toggle('is-open', next);
  }

  function initReadEvents() {
    $('#plainContent').addEventListener('click', function (e) {
      var src = e.target.closest('[data-src]');
      if (src) { showInOriginal(src.dataset.src); return; }
      var fb = e.target.closest('.flag-btn');
      if (fb) {
        var item = fb.closest('.flag');
        toggleOpen(item, fb);
        if (item.classList.contains('is-open') && !mobileQuery.matches) {
          showInOriginal(item.dataset.ref);
          var note = $('.note[data-flag="' + item.id.replace('pf-', '') + '"]');
          if (note) toggleOpen(note, $('.note-btn', note), true);
        }
        return;
      }
      if (e.target.closest('#copyAsks')) copyAsks();
    });

    $('#docInner').addEventListener('click', function (e) {
      var nb = e.target.closest('.note-btn');
      if (nb) {
        var note = nb.closest('.note');
        toggleOpen(note, nb);
        litClause(note.dataset.for);
        return;
      }
      if (e.target.closest('.note')) return;
      if (String(window.getSelection())) return;
      var row = e.target.closest('.annex-row') || e.target.closest('.clause');
      if (row) showInPlain(row.dataset.ref);
    });

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { layoutNotes(); });
      ro.observe($('#docInner'));
      new MutationObserver(function () { $$('.note').forEach(function (n) { ro.observe(n); }); layoutNotes(); })
        .observe($('#docInner'), { childList: true });
    } else {
      window.addEventListener('resize', layoutNotes);
    }
  }

  function copyAsks() {
    var list = $$('.asks li').map(function (li, i) { return (i + 1) + '. ' + li.textContent; }).join('\n');
    if (!navigator.clipboard) { toast('Copying isn’t allowed here. Select the questions and copy them by hand.', { type: 'error' }); return; }
    navigator.clipboard.writeText(list).then(function () {
      toast('Copied ' + $$('.asks li').length + ' questions. Paste them into your email to HR.');
    }, function () { toast('Copying isn’t allowed here. Select the questions and copy them by hand.', { type: 'error' }); });
  }

  /* ------------------------------------------------------------------ segmented controls */
  function initSeg(seg, attr, onChange) {
    var thumb = $('.seg-thumb', seg), x = 0, w = 0;
    var paint = function () { thumb.style.transform = 'translateX(' + x + 'px)'; thumb.style.width = w + 'px'; };
    var sx = new Spring(0, { k: 520, c: 38, eps: 0.1, onUpdate: function (v) { x = v; paint(); } });
    var sw = new Spring(0, { k: 520, c: 38, eps: 0.1, onUpdate: function (v) { w = v; paint(); } });
    var btns = $$('[role="radio"]', seg);
    var place = function (instant) {
      var b = $('[aria-checked="true"]', seg);
      if (!b || !b.offsetWidth) return;
      if (instant) { sx.jump(b.offsetLeft); sw.jump(b.offsetWidth); } else { sx.to(b.offsetLeft); sw.to(b.offsetWidth); }
    };
    var select = function (b, focus) {
      btns.forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); o.tabIndex = o === b ? 0 : -1; });
      if (focus) b.focus();
      place(false);
      onChange(b.dataset[attr]);
    };
    btns.forEach(function (b) {
      b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
      b.addEventListener('click', function () { if (b.getAttribute('aria-checked') !== 'true') select(b); });
      b.addEventListener('keydown', function (e) {
        var i = btns.indexOf(b), n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = btns[(i + 1) % btns.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = btns[(i - 1 + btns.length) % btns.length];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    seg._place = place;
    return place;
  }

  /* ------------------------------------------------------------------ read aloud */
  var VOICE_LANG = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
  var LANG_NAME = { en: 'English', hi: 'Hindi', ta: 'Tamil' };
  function setSpeaking(on) {
    var b = $('#speakBtn');
    b.setAttribute('aria-pressed', String(on));
    $('#speakLabel').textContent = on ? 'Stop' : 'Read aloud';
  }
  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if ($('#speakBtn')) setSpeaking(false);
  }
  function initSpeech() {
    $('#speakBtn').addEventListener('click', function () {
      if (!('speechSynthesis' in window)) { toast('This browser can’t read aloud. Try Chrome on your phone.', { type: 'error' }); return; }
      var syn = window.speechSynthesis;
      if (syn.speaking) { stopSpeech(); return; }
      var text = $('#summaryText').textContent;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = VOICE_LANG[state.lang]; u.rate = 0.95;
      var voices = syn.getVoices();
      var v = voices.filter(function (x) { return x.lang && x.lang.replace('_', '-').toLowerCase().indexOf(state.lang) === 0; })[0];
      if (v) u.voice = v;
      else if (state.lang !== 'en' && voices.length) toast('This device has no ' + LANG_NAME[state.lang] + ' voice installed, so it may sound unusual.', { type: 'info' });
      u.onend = u.onerror = function () { setSpeaking(false); };
      syn.speak(u);
      setSpeaking(true);
    });
  }

  /* ------------------------------------------------------------------ mobile sheet */
  var sheet = (function () {
    var pane = $('#docPane'), handle = $('#sheetHandle');
    var y = 0, s = null, dragged = false;
    var H = function () { return pane.offsetHeight; };
    var snaps = function () { return { full: 0, half: Math.round(H() * 0.46), peek: H() - 64 }; };
    var paint = function (v) {
      y = v; pane.style.setProperty('--sheet-y', v + 'px');
      handle.setAttribute('aria-expanded', String(v < snaps().peek - 2));
    };
    s = new Spring(0, { k: 380, c: 34, eps: 0.5, onUpdate: paint });
    function pos() {
      var sn = snaps(), best = 'peek', d = Infinity;
      Object.keys(sn).forEach(function (k) { var dd = Math.abs(sn[k] - s.target); if (dd < d) { d = dd; best = k; } });
      return best;
    }
    function snap(name, cb, v) { s.to(snaps()[name], v, cb); }
    function reset() {
      if (mobileQuery.matches) { s.jump(snaps().peek); }
      else { pane.style.removeProperty('--sheet-y'); handle.setAttribute('aria-expanded', 'false'); }
    }

    var startY = 0, startSheet = 0, lastY = 0, lastT = 0, vel = 0, down = false;
    handle.addEventListener('pointerdown', function (e) {
      if (!mobileQuery.matches) return;
      down = true; dragged = false; startY = e.clientY; startSheet = y; lastY = e.clientY; lastT = performance.now(); vel = 0;
      cancelAnimationFrame(s.raf); s.raf = 0;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dy = e.clientY - startY;
      if (Math.abs(dy) > 5) dragged = true;
      var now = performance.now();
      vel = (e.clientY - lastY) / Math.max(1, now - lastT) * 1000; lastY = e.clientY; lastT = now;
      var max = snaps().peek, next = startSheet + dy;
      if (next < 0) next = next * 0.3;                       // elastic past the top
      if (next > max) next = max + (next - max) * 0.3;       // and past the bottom
      s.x = next; s.v = 0; paint(next);
    });
    var end = function () {
      if (!down) return; down = false;
      if (!dragged) return;
      var projected = y + vel * 0.2, sn = snaps(), best = 'peek', d = Infinity;
      Object.keys(sn).forEach(function (k) { var dd = Math.abs(sn[k] - projected); if (dd < d) { d = dd; best = k; } });
      s.x = y; snap(best, null, vel);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('click', function () {
      if (dragged) { dragged = false; return; }
      if (!mobileQuery.matches) return;
      snap(pos() === 'peek' ? 'full' : 'peek');
    });
    mobileQuery.addEventListener('change', function () { reset(); layoutNotes(); });
    window.addEventListener('resize', function () { if (mobileQuery.matches && !down) s.jump(snaps()[pos()]); });
    return { snap: snap, pos: pos, reset: reset };
  })();

  /* ------------------------------------------------------------------ read view entry */
  var readReady = false;
  function enterRead() {
    if (!readReady) { renderDoc(); renderPlain(); readReady = true; }
    requestAnimationFrame(function () {
      sheet.reset();
      layoutNotes();
      var seg = $('#langSeg'); if (seg._place) seg._place(true);
    });
  }
  function setLang(l) {
    state.lang = l;
    stopSpeech();
    var pc = $('#plainContent');
    var swap = function () {
      noteIndex = 0; renderPlain(); renderDoc(); layoutNotes();
      pc.style.opacity = '1';
    };
    if (reduced()) { swap(); return; }
    pc.style.transition = 'opacity 120ms ease'; pc.style.opacity = '0';
    setTimeout(swap, 120);
  }
  function setPinned(on) {
    state.pinned = on;
    $('#pinBtn').setAttribute('aria-pressed', String(on));
    $('#pinBtn span').textContent = on ? 'Pinned' : 'Pin';
    if (readReady) renderPlain();
    toast(on ? 'Pinned. This reading won’t be deleted on its own.' : 'Unpinned. It will be deleted on 15 Dec 2026.');
  }

  /* ------------------------------------------------------------------ 5. in-hand pay */
  var PT = { KA: { m: 200, name: 'Karnataka', metro: false }, MH: { m: 200, name: 'Maharashtra', metro: true }, TN: { m: 208, name: 'Tamil Nadu', metro: true }, DL: { m: 0, name: 'Delhi', metro: true } };
  var SLABS = {
    new: { std: 75000, rebateUpTo: 1200000, rows: [[0, 400000, 0], [400000, 800000, 0.05], [800000, 1200000, 0.10], [1200000, 1600000, 0.15], [1600000, 2000000, 0.20], [2000000, 2400000, 0.25], [2400000, Infinity, 0.30]] },
    old: { std: 50000, rebateUpTo: 500000, rows: [[0, 250000, 0], [250000, 500000, 0.05], [500000, 1000000, 0.20], [1000000, Infinity, 0.30]] }
  };
  function slabTax(taxable, rows) {
    var parts = [], total = 0;
    rows.forEach(function (r) {
      if (taxable <= r[0]) return;
      var amt = (Math.min(taxable, r[1]) - r[0]) * r[2];
      parts.push({ from: r[0], to: Math.min(taxable, r[1]), rate: r[2], amt: amt });
      total += amt;
    });
    return { parts: parts, total: total };
  }
  function computePay(ctc, varPct, regime, st, rent) {
    var basic = Math.round(ctc * 0.4), hra = Math.round(basic * 0.4), epf = Math.round(basic * 0.12),
      grat = Math.round(basic * 0.0481), variable = Math.round(ctc * varPct);
    var special = ctc - basic - hra - epf - grat - variable;
    var gross = basic + hra + special, pt = PT[st].m, R = SLABS[regime];
    var income = gross + variable, hraEx = 0, pf80c = 0;
    if (regime === 'old') {
      if (rent > 0) hraEx = Math.max(0, Math.min(hra, rent * 12 - 0.1 * basic, (PT[st].metro ? 0.5 : 0.4) * basic));
      pf80c = Math.min(150000, epf);
    }
    var taxable = Math.max(0, income - R.std - (regime === 'old' ? pt * 12 + hraEx + pf80c : 0));
    var slab = slabTax(taxable, R.rows);
    var rebate = taxable <= R.rebateUpTo ? slab.total : 0;
    var cess = (slab.total - rebate) * 0.04;
    var taxY = slab.total - rebate + cess;
    var inhand = gross / 12 - epf / 12 - pt - taxY / 12;
    return { ctc: ctc, basic: basic, hra: hra, special: special, epf: epf, grat: grat, variable: variable, gross: gross, pt: pt, std: R.std,
      income: income, hraEx: hraEx, pf80c: pf80c, taxable: taxable, slab: slab, rebate: rebate, cess: cess, taxY: taxY, inhand: inhand, state: st, regime: regime };
  }

  function buildFlow() {
    $('#flow').innerHTML =
      stage('Cost to company (CTC)', '<span data-k="ctc"></span><small>a year</small>', 'wc') +
      '<div class="peel" style="--a:1;--b:var(--g)"><div class="ribbon" aria-hidden="true"></div><ul class="peel-list">' +
        peel('Variable pay', 'Paid once a year, only if targets are met', 'var') +
        peel('Company’s PF share', 'Goes into your PF account, not your hand', 'epf') +
        peel('Gratuity', 'Paid only if you stay 5 years or more', 'grat') +
      '</ul></div>' +
      stage('Paid to you through the year', '<span data-k="gross"></span><small>= ₹<span data-k="grossM"></span> a month</small>', 'wg') +
      '<div class="peel" style="--a:var(--g);--b:var(--i)"><div class="ribbon" aria-hidden="true"></div><ul class="peel-list">' +
        peel('Your PF', '12% of basic pay, saved for you', 'empPf', true) +
        peel('Professional tax', '<span data-t="ptName"></span>', 'pt', true) +
        peel('Income tax (TDS)', '<span data-t="taxWhy"></span>', 'tax', true) +
      '</ul></div>' +
      '<div class="stage stage-final"><div class="stage-head"><span class="stage-label">Lands in your account</span>' +
      '<span class="stage-amt">₹<span data-k="inhand"></span><small>a month</small></span></div>' +
      '<div class="bar"><div class="bar-fill" style="--w:var(--i)"></div></div></div>';
    function stage(label, amt, w) {
      return '<div class="stage"><div class="stage-head"><span class="stage-label">' + label + '</span><span class="stage-amt">₹' + amt + '</span></div>' +
        '<div class="bar"><div class="bar-fill" style="--w:' + (w === 'wc' ? 1 : 'var(--g)') + '"></div></div></div>';
    }
    function peel(name, why, k, monthly) {
      return '<li data-row="' + k + '"><span class="peel-name">' + name + '</span><span class="peel-why">' + why + '</span>' +
        '<span class="peel-amt">− ₹<span data-k="' + k + '"></span>' + (monthly ? ' /mo' : ' /yr') + '</span></li>';
    }
  }

  var shown = null, payTarget = null;
  var tween = new Spring(1, { k: 170, c: 19, eps: 0.0015, onUpdate: paintFlow });
  var tweenFrom = null;
  function snapshot(r) {
    return { ctc: r.ctc, gross: r.gross, grossM: r.gross / 12, inhand: r.inhand, var: r.variable, epf: r.epf, grat: r.grat,
      empPf: r.epf / 12, pt: r.pt, tax: r.taxY / 12, g: r.gross / r.ctc, i: (r.inhand * 12) / r.ctc };
  }
  function paintFlow(p) {
    if (!payTarget) return;
    var f = tweenFrom || payTarget, cur = {};
    Object.keys(payTarget).forEach(function (k) { cur[k] = f[k] + (payTarget[k] - f[k]) * p; });
    shown = cur;
    var flow = $('#flow');
    flow.style.setProperty('--g', Math.max(0, cur.g).toFixed(4));
    flow.style.setProperty('--i', Math.max(0, cur.i).toFixed(4));
    $$('[data-k]', $('.view-pay')).forEach(function (el) { el.textContent = inr(Math.max(0, cur[el.dataset.k])); });
  }
  function readNum(input) { return parseInt(String(input.value).replace(/[^\d]/g, ''), 10) || 0; }

  function updatePay(fromFull) {
    var ctcIn = $('#ctcInput'), ctc = readNum(ctcIn);
    var valid = ctc >= 100000 && ctc <= 10000000;
    ctcIn.setAttribute('aria-invalid', String(!valid));
    $('#ctcHelp').textContent = valid ? 'Filled in from p.1 · clause 4. Change it to try other offers.' : 'Enter a yearly CTC between ₹1,00,000 and ₹1,00,00,000.';
    if (!valid) return;
    var st = $('#ptState').value, rent = readNum($('#rentInput'));
    var r = computePay(ctc, 0.10, state.regime, st, rent);
    var other = computePay(ctc, 0.10, state.regime === 'new' ? 'old' : 'new', st, rent);

    var target = snapshot(r);
    tweenFrom = fromFull ? Object.assign({}, target, { g: 1, i: 1 }) : (shown || target);
    payTarget = target;
    tween.jump(0); tween.to(1);

    var perMonthCtc = ctc / 12;
    $('#inhandNote').textContent = 'That’s ' + Math.round(r.inhand / perMonthCtc * 100) + '% of the ₹' + inr(perMonthCtc) + ' a month your CTC suggests.';
    var diff = Math.round(r.inhand - other.inhand);
    $('#regimeHint').textContent = diff >= 0
      ? 'With these numbers, the ' + state.regime + ' regime leaves you ₹' + inr(diff) + ' more each month.'
      : 'With these numbers, the ' + (state.regime === 'new' ? 'old' : 'new') + ' regime would leave you ₹' + inr(-diff) + ' more each month.';
    $('#rentField').hidden = state.regime !== 'old';
    $$('[data-t="ptName"]').forEach(function (el) { el.textContent = r.pt ? 'Set by ' + PT[st].name : PT[st].name + ' has none'; });
    $$('[data-t="taxWhy"]').forEach(function (el) { el.textContent = r.taxY < 1 ? 'None — your income is under the limit' : 'Spread over 12 months'; });
    $$('.peel-list li').forEach(function (li) {
      var k = li.dataset.row, val = { empPf: r.epf, pt: r.pt, tax: r.taxY }[k];
      li.classList.toggle('is-zero', val !== undefined && val < 1);
    });
    renderWorking(r);
  }

  function renderWorking(r) {
    var w = [];
    var row = function (text, amt, extra) { w.push('<li><span class="w-text">' + text + (extra || '') + '</span><span class="w-amt">' + amt + '</span></li>'); };
    row('<b>Basic pay</b> = 40% of CTC ₹' + inr(r.ctc), '₹' + inr(r.basic) + ' /yr');
    row('<b>Paid to you through the year</b> = basic ₹' + inr(r.basic) + ' + HRA ₹' + inr(r.hra) + ' + special allowance ₹' + inr(r.special), '₹' + inr(r.gross) + ' /yr');
    row('<b>Not in your monthly pay</b> = variable ₹' + inr(r.variable) + ' + company’s PF ₹' + inr(r.epf) + ' + gratuity ₹' + inr(r.grat), '₹' + inr(r.variable + r.epf + r.grat) + ' /yr');
    row('<b>Your PF</b> = 12% of monthly basic ₹' + inr(r.basic / 12), '₹' + inr(r.epf / 12) + ' /mo');
    row('<b>Professional tax</b> (' + PT[r.state].name + ')', '₹' + inr(r.pt) + ' /mo');
    var ded = 'income ₹' + inr(r.income) + ' (incl. variable) − standard deduction ₹' + inr(r.std);
    if (r.regime === 'old') ded += ' − PF under 80C ₹' + inr(r.pf80c) + ' − professional tax ₹' + inr(r.pt * 12) + (r.hraEx ? ' − HRA exemption ₹' + inr(r.hraEx) : '');
    row('<b>Taxable income</b> = ' + ded, '₹' + inr(r.taxable) + ' /yr');
    var slabs = '<span class="slabs">' + r.slab.parts.map(function (p) {
      return '<span>₹' + inr(p.from) + ' – ₹' + inr(p.to) + '</span><span>' + Math.round(p.rate * 100) + '%</span><span>₹' + inr(p.amt) + '</span>';
    }).join('') + '</span>';
    row('<b>Tax by slab</b> (' + r.regime + ' regime)', '₹' + inr(r.slab.total) + ' /yr', slabs);
    if (r.rebate) row('<b>Rebate under section 87A</b> — taxable income is ₹' + inr(SLABS[r.regime].rebateUpTo) + ' or less, so this tax is cancelled', '− ₹' + inr(r.rebate));
    row('<b>Health and education cess</b> = 4% of remaining tax', '₹' + inr(r.cess) + ' /yr');
    row('<b>In your account</b> = ₹' + inr(r.gross / 12) + ' − PF ₹' + inr(r.epf / 12) + ' − professional tax ₹' + inr(r.pt) + ' − tax ₹' + inr(r.taxY / 12), '₹' + inr(r.inhand) + ' /mo');
    $('#working').innerHTML = w.join('');
  }

  function enterPay() {
    var first = !state.payVisited;
    state.payVisited = true;
    var seg = $('#regimeSeg');
    requestAnimationFrame(function () { if (seg._place) seg._place(true); updatePay(first); });
  }

  function initPay() {
    buildFlow();
    initSeg($('#regimeSeg'), 'regime', function (v) { state.regime = v; updatePay(false); });
    var t = 0;
    var deb = function () { clearTimeout(t); t = setTimeout(function () { updatePay(false); }, 220); };
    ['ctcInput', 'rentInput'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', deb);
      el.addEventListener('blur', function () { var n = readNum(el); if (n) el.value = inr(n); });
    });
    $('#ptState').addEventListener('change', function () { updatePay(false); });
  }

  /* ------------------------------------------------------------------ 6. compare */
  function renderCompare() {
    var A = D.offers.a, B = D.offers.b;
    var ra = computePay(A.ctc, A.varPct, 'new', 'KA', 0), rb = computePay(B.ctc, B.varPct, 'new', 'KA', 0);
    var diff = Math.round(rb.inhand - ra.inhand);
    $('#compareSummary').innerHTML = '<strong>Larkspur leaves about ₹' + inr(diff) + ' more in your account each month</strong>, even though its CTC is ₹40,000 lower, because less of it depends on targets. It also has no bond and a shorter notice period. Northwind gives 6 more days of leave and covers your parents’ health. Which suits you depends on how long you plan to stay.';

    var head = '<thead><tr><th scope="col"><span class="sr-only">What’s compared</span></th>' +
      offerHead('Offer A', A.name, 'Graduate Engineer Trainee · received 10 Nov 2026') +
      offerHead('Offer B', B.name, 'Associate Software Engineer · received 12 Nov 2026') + '</tr></thead>';
    var body = '<tbody>' + D.compareRows.map(function (r, i) {
      var a = r.a, b = r.b, note = r.note;
      if (r.calc === 'inhand') { a = '₹' + inr(ra.inhand) + ' a month'; b = '₹' + inr(rb.inhand) + ' a month'; note = '₹' + inr(diff) + ' more'; }
      var depends = r.win === 'depends' ? '<span class="depends-note">' + esc(note || 'Depends on what you prefer') + '</span>' : '';
      return '<tr style="--i:' + i + '"><th scope="row">' + esc(r.k) + depends + '</th>' + cell(a, r.win === 'a', note, r.srcA) + cell(b, r.win === 'b', note) + '</tr>';
    }).join('') + '</tbody>';
    var cap = $('#ctable caption').outerHTML;
    $('#ctable').innerHTML = cap + head + body;

    function offerHead(tag, name, sub) {
      return '<th scope="col"><div class="offer-head"><span class="badge badge-demo">Demo · ' + tag + '</span><strong>' + esc(name) + '</strong><small>' + esc(sub) + '</small></div></th>';
    }
    function cell(v, better, note, src) {
      return '<td class="' + (better ? 'better' : '') + '"><span class="cval">' + esc(v) + '</span>' +
        (better ? '<span class="better-note">' + esc(note) + '<span class="sr-only"> — better for you</span></span>' : '') +
        (src ? '<span class="cmp-src">' + src + '</span>' : '') + '</td>';
    }
  }
  $('#emptyToggle').addEventListener('change', function (e) {
    $('#compareFull').hidden = e.target.checked;
    $('#compareEmpty').hidden = !e.target.checked;
  });
  $('#fileInput2').addEventListener('change', function (e) {
    e.target.value = '';
    $('#emptyToggle').checked = false;
    $('#compareFull').hidden = false; $('#compareEmpty').hidden = true;
    renderCompare();
    toast('In this static demo, the second offer is the fictional Larkspur letter.', { type: 'info' });
  });

  /* ------------------------------------------------------------------ docbar actions */
  $('#pinBtn').addEventListener('click', function () { setPinned(!state.pinned); });
  $('#deleteBtn').addEventListener('click', function () { $('#deleteDialog').showModal(); });
  $('#deleteDialog').addEventListener('close', function () {
    if ($('#deleteDialog').returnValue !== 'delete') return;
    state.pinned = false; $('#pinBtn').setAttribute('aria-pressed', 'false'); $('#pinBtn span').textContent = 'Pin';
    go('upload');
    toast('Everything is deleted. Nothing from this document is stored anywhere.');
  });

  /* ------------------------------------------------------------------ boot */
  initTheme();
  initTilt();
  initReadEvents();
  initSpeech();
  initSeg($('#langSeg'), 'lang', setLang);
  initPay();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { $$('.seg').forEach(function (s) { if (s._place) s._place(true); }); layoutNotes(); });
  }
  window.addEventListener('resize', function () { $$('.seg').forEach(function (s) { if (s._place) s._place(true); }); });
  window.addEventListener('hashchange', function () {
    var v = location.hash.slice(1);
    if (v && v !== state.view) go(v);
  });
  go((location.hash || '#upload').slice(1));
})();
