/* ui.js — Teacher Desk 2 Mobile 화면(그리기·누르기).
   자료는 window.TD2M(core.js)에서만 받는다. 이 파일은 계산하지 않고 그리기만 한다
   (지금 몇 교시인지만 폰 시계로 잰다). 화면 설정은 window.TD2PREFS(prefs.js)가 맡는다.
   규칙: 자료 글자는 textContent로만 넣는다. innerHTML·insertAdjacentHTML·outerHTML 쓰지 않음.
   날짜 YYYY-MM-DD는 늘 로컬 날짜(new Date(y, m-1, d))로 다룬다. */
(function () {
  'use strict';

  var M = window.TD2M;
  function $(id) { return document.getElementById(id); }

  if (!M || !M.state) {
    var bootEl = $('scr-boot');
    if (bootEl) {
      bootEl.hidden = false;
      bootEl.textContent = '페이지를 불러오지 못했습니다. 새로 고쳐 주세요.';
    }
    return;
  }

  var UI_VER = 'm2 · 2026-09-14';
  var PR = window.TD2PREFS || null;
  function prefs() {
    return PR ? PR.get() : { theme: 'base', accent: 'red', font: 'pretendard', size: 'm', start: 'last', tab: 'cal' };
  }
  function setPref(patch) { if (PR) PR.set(patch); }

  // ── DOM 도구 ─────────────────────────────
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function btn(cls, text, fn) {
    var b = h('button', cls, text);
    b.type = 'button';
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICON = {
    left: 'M15 5 8 12l7 7',
    right: 'm9 5 7 7-7 7',
    refresh: 'M20 12a8 8 0 1 1-2.35-5.65M20 4v5h-5',
    close: 'M6 6l12 12M18 6 6 18',
    up: 'm6 15 6-6 6 6',
    down: 'm6 9 6 6 6-6',
    sliders: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4'
  };
  function icon(name) {
    var s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', ICON[name]);
    s.appendChild(p);
    return s;
  }
  function iconBtn(cls, name, label, fn) {
    var b = btn(cls, null, fn);
    b.setAttribute('aria-label', label);
    b.appendChild(icon(name));
    return b;
  }
  function sec(title, right, hot) {
    var d = h('div', 'sec');
    d.appendChild(h('h2', '', title));
    if (right !== undefined && right !== null && right !== '') d.appendChild(h('span', 'r' + (hot ? ' hot' : ''), right));
    return d;
  }
  function empty(text) { return h('p', 'empty', text); }
  function table(widths, cls) {
    var t = h('table', 't' + (cls ? ' ' + cls : ''));
    var cg = h('colgroup');
    widths.forEach(function (w) {
      var c = h('col');
      if (w) c.style.width = w;      // CSSOM이라 CSP(style-src)에 걸리지 않음
      cg.appendChild(c);
    });
    t.appendChild(cg);
    return t;
  }
  function td(cls, text) { return h('td', cls, text); }
  function arr(x) { return Array.isArray(x) ? x : []; }

  // ── 날짜 도구 ────────────────────────────
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function isYmd(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function toDate(s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
  function dayNum(s) { return Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000); }
  function addDays(s, n) { var d = toDate(s); d.setDate(d.getDate() + n); return ymd(d); }
  function diff(a, b) { return dayNum(b) - dayNum(a); }
  function today() { return ymd(new Date()); }
  function dowOf(s) { return toDate(s).getDay(); }
  function md(s) { return isYmd(s) ? s.slice(5) : ''; }
  function dayLabel(s) { return isYmd(s) ? s.slice(5) + ' (' + DOW[dowOf(s)] + ')' : ''; }
  function ym(s) { return s.slice(0, 7); }
  function addMonths(ymStr, n) {
    var y = +ymStr.slice(0, 4), m = +ymStr.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return y + '-' + pad(m + 1);
  }
  function toMin(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
    return m ? (+m[1]) * 60 + (+m[2]) : NaN;
  }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtMin(n) {
    if (n < 60) return n + '분';
    var hh = Math.floor(n / 60), mm = n % 60;
    return hh + '시간' + (mm ? ' ' + mm + '분' : '');
  }
  function ago(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    var hr = Math.floor(m / 60);
    if (hr < 24) return hr + '시간 전';
    return Math.floor(hr / 24) + '일 전';
  }
  function relDay(t, ds) {
    var n = diff(t, ds);
    if (n === 0) return '오늘';
    if (n === 1) return '내일';
    if (n === -1) return '어제';
    return n > 0 ? n + '일 뒤' : (-n) + '일 전';
  }

  // ── 자료 접근 ───────────────────────────
  function S() { return M.state || {}; }
  function V() { return S().view || null; }
  function isReady() { return S().phase === 'ready' && !!S().view; }
  function dayOf(s) { var v = V(); return (v && v.days && v.days[s]) || null; }
  function rangeFrom() { var v = V(); return (v && v.range && isYmd(v.range.from)) ? v.range.from : addDays(today(), -60); }
  function rangeTo() { var v = V(); return (v && v.range && isYmd(v.range.to)) ? v.range.to : addDays(today(), 90); }
  function clampDay(s, a, b) { return s < a ? a : (s > b ? b : s); }
  function pend() { return arr(S().pending); }
  function isActive(o) { return o && (o.status === 'queued' || o.status === 'sent'); }

  // 학생 자료: 반별(test2) 형식으로 맞춘다. 옛 형식(test1: attend.cls·students·days + view.talk)도 받는다.
  function attendModel() {
    var v = V();
    if (!v || v.students !== true || !v.attend) return null;
    if (ui.amSrc === v && ui.am) return ui.am;
    var a = v.attend;
    var classes = [];
    if (Array.isArray(a.classes)) {
      classes = a.classes.filter(function (c) { return c && c.cls && Array.isArray(c.students); }).map(function (c) {
        return { cls: String(c.cls), hr: !!c.hr || String(c.cls) === a.homeroom, students: c.students, days: c.days || {}, talk: c.talk || {} };
      });
    } else if (Array.isArray(a.students)) {
      classes = [{ cls: String(a.cls || ''), hr: true, students: a.students, days: a.days || {}, talk: v.talk || {} }];
    }
    var hrs = classes.filter(function (c) { return c.hr; });
    var rest = classes.filter(function (c) { return !c.hr; });
    ui.am = {
      homeroom: a.homeroom || (hrs[0] ? hrs[0].cls : ''),
      cur: a.cur || '',
      slots: arr(a.slots),
      gubun: arr(a.gubun),
      jong: arr(a.jong),
      classes: hrs.concat(rest)
    };
    ui.amSrc = v;
    return ui.am;
  }
  function hasStudents() { var m = attendModel(); return !!(m && m.classes.length); }
  function clsOf(cls) {
    var m = attendModel();
    return m ? (m.classes.filter(function (c) { return c.cls === cls; })[0] || null) : null;
  }
  function defaultCls(m) {
    if (clsOf(m.cur)) return m.cur;
    if (clsOf(m.homeroom)) return m.homeroom;
    return m.classes[0].cls;
  }
  function stuIn(c, key) {
    return c ? (arr(c.students).filter(function (s) { return s.key === key; })[0] || null) : null;
  }
  function sortedStudents(c) {
    return arr(c.students).slice().sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
  }
  function stuNameIn(cls, key) {
    var st = stuIn(clsOf(cls), key);
    return st ? st.name : String(key || '').split('|').pop();
  }

  // 분류 색(가는 왼쪽 줄에만 씀)
  var CAT = {
    blue: '#2F6DB5', green: '#2E8B57', amber: '#C98A12', yellow: '#C9A400', orange: '#D2691E',
    red: '#C8102E', pink: '#C2528B', purple: '#7B5EA7', teal: '#2A8C8C', navy: '#1F3A68',
    brown: '#8B5A2B', gray: '#8C8C8C', grey: '#8C8C8C', black: '#141414'
  };
  function catColor(c) {
    if (typeof c !== 'string') return '';
    if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
    return CAT[c] || '#9A9A9A';
  }

  // ── UI 상태 ─────────────────────────────
  var TABS = ['cal', 'today', 'memo', 'stu'];
  var p0 = prefs();
  var ui = {
    tab: p0.start !== 'last' ? p0.start : p0.tab,
    dayRef: today(),
    calYm: '', calSel: '', tdDay: '', stuDay: '', stuCls: '',
    showDone: false,
    scroll: {},
    pbarOpen: false,
    rej: {}, dismissed: {},
    overlay: null, pushed: false, ignorePop: false,
    sheet: null,
    sel: null, clearArm: 0, logoutArm: 0,
    refocusTodo: false,
    am: null, amSrc: null,
    toastTimer: 0, queued: false
  };
  if (TABS.indexOf(ui.tab) < 0) ui.tab = 'cal';

  // ── 폰에서 적은 것을 먼저 보이기(낙관적 표시) ─────
  // mark: 'wait'(PC 반영 대기) · 'next'(다음 회차로 넘김 대기) · 'ok'(반영됨) · 'rej'(반영 못 함)
  var MARK = { wait: 'PC 반영 대기', next: '다음 회차로 넘김 대기', ok: '반영됨', rej: '반영 못 함', short: '대기' };
  function markEl(mark, short) {
    var cls = 'mk' + (mark === 'ok' ? ' ok' : '') + (mark === 'rej' ? ' rej' : '');
    return h('span', cls, short && mark === 'wait' ? MARK.short : MARK[mark]);
  }

  // 반영된 입력이 들어간 줄 찾기: test2부터는 줄.mid === op.id, mid 칸이 없는 옛 파일만 글자로
  function markApplied(list, o, textOf) {
    var i;
    var hasMid = list.some(function (x) { return typeof x.mid === 'string'; });
    if (hasMid) {
      for (i = 0; i < list.length; i++) {
        if (list[i].mid === o.id) { if (!list[i].mark) list[i].mark = 'ok'; return; }
      }
      return;
    }
    for (i = 0; i < list.length; i++) {
      if (textOf(list[i]) && !list[i].mark) { list[i].mark = 'ok'; return; }
    }
  }

  function dispTodos() {
    var v = V();
    if (!v) return [];
    var list = arr(v.todos).map(function (t) {
      return {
        fp: t.fp, mid: t.mid, t: String(t.t || ''), done: !!t.done, srcDone: !!t.done, doneAt: t.doneAt || '',
        due: t.due || '', start: t.start || '', rep: t.rep || '', repLabel: t.repLabel || '',
        cat: t.cat || null, mark: '', isNew: false
      };
    });
    var byFp = {};
    list.forEach(function (x) { if (x.fp && !byFp[x.fp]) byFp[x.fp] = x; });
    var added = [];
    pend().forEach(function (o) {
      var p = o.p || {};
      var x;
      if (o.type === 'todo.add') {
        if (isActive(o)) {
          added.unshift({ fp: '', t: String(p.t || ''), done: false, srcDone: false, doneAt: '', due: p.due || '', start: '', rep: '', repLabel: '', cat: null, mark: 'wait', isNew: true });
        } else if (o.status === 'applied') {
          markApplied(list, o, function (r) { return r.t === p.t; });
        }
      } else if (o.type === 'todo.done') {
        x = byFp[p.fp];
        if (!x) return;
        if (isActive(o)) {
          if (x.rep) { if (p.on) x.mark = 'next'; }
          else { x.done = !!p.on; x.mark = 'wait'; }
        } else if (o.status === 'applied') {
          if (x.mark !== 'wait' && x.mark !== 'next') x.mark = 'ok';
        } else if (o.status === 'rejected' && !ui.dismissed[o.id]) {
          if (!x.mark) x.mark = 'rej';
        }
      }
    });
    return added.concat(list);
  }

  function dispMemos() {
    var v = V();
    if (!v) return [];
    var list = arr(v.memos).map(function (m) {
      return { t: String(m.t || ''), mid: m.mid, c: m.c || '', card: String(m.card || '메모'), mark: '' };
    });
    var first = list[0] || { c: '', card: '메모' };
    var added = [];
    pend().forEach(function (o) {
      if (o.type !== 'memo.add') return;
      var p = o.p || {};
      if (isActive(o)) added.unshift({ t: String(p.t || ''), c: first.c, card: first.card, mark: 'wait' });
      else if (o.status === 'applied') markApplied(list, o, function (r) { return r.t === p.t; });
    });
    return added.concat(list);
  }

  var ATT_ONE = { 'attend.set': 1, 'attend.clear': 1 };
  var ATT_MANY = { 'attend.setMany': 1, 'attend.clearMany': 1 };
  function attRec(cls, date, key) {
    var c = clsOf(cls);
    var rec = (c && c.days[date] && c.days[date][key]) || null;
    var mark = '';
    pend().forEach(function (o) {
      var p = o.p || {};
      if (p.cls !== cls || p.date !== date) return;
      var hit = ATT_ONE[o.type] ? p.key === key : (ATT_MANY[o.type] ? arr(p.keys).indexOf(key) >= 0 : false);
      if (!hit) return;
      if (isActive(o)) {
        rec = (o.type === 'attend.set' || o.type === 'attend.setMany') ? (p.rec || null) : null;
        mark = 'wait';
      } else if (o.status === 'applied') {
        if (mark !== 'wait') mark = 'ok';
      } else if (o.status === 'rejected' && !ui.dismissed[o.id]) {
        if (mark !== 'wait') mark = 'rej';
      }
    });
    return { rec: rec, mark: mark };
  }

  function talkList(cls, key, name) {
    var c = clsOf(cls);
    var base = arr(c && c.talk[key]).map(function (x) {
      return { d: x.d || '', t: String(x.t || ''), mid: x.mid, mark: '' };
    });
    var added = [];
    pend().forEach(function (o) {
      if (o.type !== 'snote.add') return;
      var p = o.p || {};
      if (p.cls !== cls || p.name !== name) return;
      if (isActive(o)) added.unshift({ d: p.d || '', t: String(p.t || ''), mark: 'wait' });
      else if (o.status === 'applied') markApplied(base, o, function (r) { return r.t === p.t && r.d === p.d; });
    });
    var all = added.concat(base);
    return all.map(function (x, i) { return { x: x, i: i }; })
      .sort(function (a, b) { return a.x.d < b.x.d ? 1 : (a.x.d > b.x.d ? -1 : a.i - b.i); })
      .map(function (w) { return w.x; });
  }

  function slotShort(id) {
    var m = attendModel();
    var sl = m ? m.slots.filter(function (x) { return x.id === id; })[0] : null;
    return String(sl ? (sl.nm || id) : id).replace(/교시$/, '');
  }
  function recText(rec) {
    if (!rec) return '출석';
    var m = attendModel();
    var slots = m ? m.slots : [];
    var ps = arr(rec.p);
    var s = (slots.length && ps.length === slots.length) ? '전체' : ps.map(slotShort).join('·');
    return [rec.g, rec.k].filter(Boolean).join(' ') + (s ? ' · ' + s : '');
  }

  // ── 그리기 예약 ─────────────────────────
  function schedule() {
    if (ui.queued) return;
    ui.queued = true;
    var run = function () { ui.queued = false; render(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  function rollDay() {
    var t = today();
    if (t === ui.dayRef) return;
    var old = ui.dayRef;
    if (ui.calSel === old) ui.calSel = t;
    if (ui.calYm === ym(old)) ui.calYm = ym(t);
    if (ui.tdDay === old) ui.tdDay = t;
    if (ui.stuDay === old) ui.stuDay = t;
    ui.dayRef = t;
  }

  function trackRejected() {
    pend().forEach(function (o) {
      if (o.status === 'rejected' && !ui.dismissed[o.id] && !ui.rej[o.id]) {
        ui.rej[o.id] = { id: o.id, type: o.type, p: o.p || {}, at: o.at || '', status: 'rejected', why: o.why || '반영하지 못했습니다' };
      }
    });
  }
  function rejectedList() {
    return Object.keys(ui.rej).map(function (k) { return ui.rej[k]; })
      .filter(function (o) { return !ui.dismissed[o.id]; })
      .sort(function (a, b) { return a.at < b.at ? -1 : 1; });
  }

  // ── 전체 그리기 ─────────────────────────
  function render() {
    var s = S();
    rollDay();
    trackRejected();
    var ph = s.phase;
    var ready = ph === 'ready' && !!s.view;

    renderHeader(s, ready);
    renderBands(s, ready);

    $('scr-boot').hidden = !(ph === 'boot' || !ph || (ph === 'ready' && !s.view));
    $('scr-login').hidden = ph !== 'login';
    $('scr-error').hidden = ph !== 'error';
    $('scr-ready').hidden = !ready;
    $('tabs').hidden = !ready;

    if (ph === 'error') renderError(s);
    if (ready) {
      renderTabs();
      renderActive();
    } else {
      ui.sel = null;
    }
    renderActbar(ready);
    renderPbar(ready);
    if (ui.overlay === 'sheet') {
      if (ready) renderSheetLive();
      else closeOverlay();
    } else if (ui.overlay === 'opt') {
      renderOptAcct();
    }
  }

  function renderHeader(s, ready) {
    var st = $('hd-st'), sc = $('hd-school'), sy = $('hd-sync'), rb = $('btn-refresh');
    clear(sy);
    if (ready) {
      var school = s.view.school || {};
      sc.textContent = [school.name, school.homeroom].filter(Boolean).join(' · ');
      var at = Date.parse(s.view.at);
      if (!isNaN(at)) {
        var d = new Date(at);
        var age = Date.now() - at;
        var when = (ymd(d) === today() ? '' : md(ymd(d)) + ' ') + hm(d);
        sy.appendChild(h('span', age > 86400000 ? 'old' : '', 'PC ' + when + ' · ' + ago(age)));
      }
      st.hidden = false;
      rb.hidden = false;
    } else {
      sc.textContent = '';
      st.hidden = true;
      rb.hidden = true;
    }
    rb.disabled = !!s.busy;
    rb.classList.toggle('busy', !!s.busy);
    rb.setAttribute('aria-busy', s.busy ? 'true' : 'false');
    $('btn-opt').hidden = !PR;
  }

  function renderBands(s, ready) {
    $('band-inapp').hidden = !s.inapp;
    var errOn = ready && !!s.err;
    $('band-err').hidden = !errOn;
    if (errOn) $('band-err-tx').textContent = s.err;
    $('btn-band-retry').disabled = !!s.busy;
    var stale = false;
    if (ready) {
      var at = Date.parse(s.view.at);
      if (!isNaN(at) && Date.now() - at > 86400000) {
        stale = true;
        var hr = Math.floor((Date.now() - at) / 3600000);
        var span = hr < 48 ? hr + '시간' : Math.floor(hr / 24) + '일';
        $('band-stale-tx').textContent = 'PC가 ' + span + ' 동안 자료를 올리지 않았습니다 — PC가 꺼져 있으면 폰에서 적은 것은 PC를 켤 때 반영됩니다';
      }
    }
    $('band-stale').hidden = !stale;
  }

  // ── 오류 화면 ───────────────────────────
  var ERR = {
    'no-view': {
      title: 'PC에서 폰 연동을 켜 주세요',
      desc: 'PC가 올린 폰 자료를 아직 찾지 못했습니다.',
      steps: ['PC에서 TeacherDesk2를 엽니다', '설정 → [데이터] → 폰 연동을 켭니다', 'PC 간 동기화에 이 폰과 같은 구글 계정으로 로그인합니다', 'PC가 자료를 올린 뒤 아래 [다시 확인]을 누릅니다'],
      act: '다시 확인', fn: 'refresh'
    },
    'no-drive': { title: '구글 드라이브 허락이 빠졌습니다', desc: '로그인할 때 허락 화면의 ‘구글 드라이브’ 칸을 켜야 PC 자료를 읽을 수 있습니다.', act: '다시 로그인', fn: 'login' },
    'newer': { title: '페이지를 새로 고쳐 주세요', desc: 'PC 앱이 이 페이지보다 새 형식으로 자료를 올렸습니다.', act: '새로 고침', fn: 'reload' },
    'net': { title: '연결하지 못했습니다', desc: '', act: '다시 시도', fn: 'refresh' },
    'auth': { title: '다시 로그인해 주세요', desc: '', act: '다시 로그인', fn: 'login' },
    'inapp': { title: '이 브라우저에서는 로그인할 수 없습니다', desc: '카카오톡·네이버 안에서 연 페이지는 구글 로그인이 막힙니다. 기본 브라우저로 열어 주세요.', act: '기본 브라우저로 열기', fn: 'external' },
    '': { title: '자료를 불러오지 못했습니다', desc: '', act: '다시 시도', fn: 'refresh' }
  };
  var errFn = 'refresh';
  function renderError(s) {
    var e = ERR[s.errCode] || ERR[''];
    $('err-title').textContent = e.title;
    $('err-desc').textContent = e.desc || s.err || '잠시 뒤 다시 시도해 주세요.';
    var ol = $('err-steps');
    clear(ol);
    arr(e.steps).forEach(function (x) { ol.appendChild(h('li', '', x)); });
    ol.hidden = !arr(e.steps).length;
    var act = $('btn-err-act');
    act.textContent = s.busy ? '확인하는 중' : e.act;
    act.disabled = !!s.busy;
    errFn = e.fn;
    $('err-email').textContent = s.email ? s.email + ' 로그인됨' : '로그인 정보 없음';
  }

  // ── 탭 ─────────────────────────────────
  function renderTabs() {
    var stuOk = hasStudents();
    $('tab-stu').hidden = !stuOk;
    if (ui.tab === 'stu' && !stuOk) ui.tab = 'cal';
    TABS.forEach(function (t) {
      var b = $('tab-' + t);
      var on = ui.tab === t;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      $('v-' + t).hidden = !on;
    });
  }
  function renderActive() {
    if (ui.tab === 'cal') renderCal();
    else if (ui.tab === 'today') renderToday();
    else if (ui.tab === 'memo') renderMemo();
    else if (ui.tab === 'stu') renderStu();
  }
  // 탭마다 스크롤 자리를 기억 — 같은 탭을 다시 누르면 맨 위로
  function setTab(t) {
    if (ui.tab === t) { window.scrollTo(0, 0); return; }
    ui.scroll[ui.tab] = window.pageYOffset || 0;
    ui.tab = t;
    ui.sel = null;
    ui.clearArm = 0;
    setPref({ tab: t });
    render();
    window.scrollTo(0, ui.scroll[t] || 0);
  }

  // ── 1) 캘린더 ───────────────────────────
  function renderCal() {
    var t = today();
    var from = rangeFrom(), to = rangeTo();
    if (!ui.calSel) ui.calSel = clampDay(t, from, to);
    if (!ui.calYm) ui.calYm = ym(ui.calSel);
    var list = dispTodos();
    renderMonth(t, from, to);
    renderSelDay(t, list);
    renderUpcoming(t);
    renderDday(t);
    renderTodos(t, list);
    dueChips();
  }

  function renderMonth(t, from, to) {
    var box = $('cal-month');
    clear(box);
    var minYm = ym(from), maxYm = ym(to);
    if (ui.calYm < minYm) ui.calYm = minYm;
    if (ui.calYm > maxYm) ui.calYm = maxYm;
    var cur = ui.calYm;

    var bar = h('div', 'mbar');
    var prev = iconBtn('mbtn l', 'left', '이전 달', function () { ui.calYm = addMonths(ui.calYm, -1); renderCal(); });
    prev.disabled = cur <= minYm;
    var mid = h('div', 'mid');
    mid.appendChild(h('span', 'ym', cur));
    var lg = h('span', 'lg');
    [['lgm', '내 일정'], ['lgs', '학사'], ['lgg', '구글']].forEach(function (x) {
      var w = h('span', 'lgi');
      w.appendChild(h('i', x[0]));
      w.appendChild(document.createTextNode(x[1]));
      lg.appendChild(w);
    });
    mid.appendChild(lg);
    var next = iconBtn('mbtn r', 'right', '다음 달', function () { ui.calYm = addMonths(ui.calYm, 1); renderCal(); });
    next.disabled = cur >= maxYm;
    bar.appendChild(prev);
    bar.appendChild(mid);
    bar.appendChild(next);
    box.appendChild(bar);

    var dow = h('div', 'dow');
    dow.setAttribute('aria-hidden', 'true');
    DOW.forEach(function (d, i) { dow.appendChild(h('span', i === 0 ? 's' : '', d)); });
    box.appendChild(dow);

    var grid = h('div', 'grid');
    var y = +cur.slice(0, 4), m = +cur.slice(5, 7);
    var lead = new Date(y, m - 1, 1).getDay();
    var nDays = new Date(y, m, 0).getDate();
    var cells = Math.ceil((lead + nDays) / 7) * 7;
    for (var i = 0; i < cells; i++) {
      var dn = i - lead + 1;
      if (dn < 1 || dn > nDays) { grid.appendChild(h('div', 'c off')); continue; }
      grid.appendChild(dayCell(cur + '-' + pad(dn), i % 7, dn, m, t));
    }
    box.appendChild(grid);
  }

  function dayCell(ds, col, dn, m, t) {
    var d = dayOf(ds);
    var evs = d ? arr(d.events) : [];
    var red = evs.some(function (e) { return e && e.red; });
    var cls = 'c' + (col === 0 ? ' sun' : '') + (col === 6 ? ' sat' : '') + (red ? ' red' : '') +
      (ds === t ? ' today' : '') + (ds === ui.calSel ? ' sel' : '');
    var b = btn(cls, null, function () { ui.calSel = ds; renderCal(); });
    b.appendChild(h('span', 'dn', dn));
    var kinds = {};
    evs.forEach(function (e) { if (e) kinds[e.src === 'mine' || e.src === 'sched' ? e.src : 'gcal'] = true; });
    var bars = h('span', 'bars');
    if (kinds.mine) bars.appendChild(h('i', 'b m'));
    if (kinds.sched) bars.appendChild(h('i', 'b s'));
    if (kinds.gcal) bars.appendChild(h('i', 'b g'));
    b.appendChild(bars);
    if (evs.length > 3) b.appendChild(h('span', 'tn', evs.length));
    b.setAttribute('aria-label', m + '월 ' + dn + '일 ' + DOW[col] + '요일' + (ds === t ? ', 오늘' : '') +
      (red ? ', 쉬는 날' : '') + (evs.length ? ', 일정 ' + evs.length + '건' : ''));
    b.setAttribute('aria-pressed', ds === ui.calSel ? 'true' : 'false');
    if (ds === t) b.setAttribute('aria-current', 'date');
    return b;
  }

  var SRC_KO = { mine: '내', sched: '학사', gcal: '구글' };
  function srcChip(src) {
    var k = SRC_KO[src] ? src : 'gcal';
    return h('span', 'src ' + k, SRC_KO[k]);
  }
  function sortEvents(evs) {
    return evs.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
      var ta = a.e.tm || '', tb = b.e.tm || '';
      if (!ta !== !tb) return ta ? 1 : -1;
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.i - b.i;
    }).map(function (w) { return w.e; });
  }
  function eventMini(e) {
    var parts = [];
    if (e.cont) parts.push('이어짐');
    if (e.tm && e.end) parts.push(e.tm + '–' + e.end);
    if (e.red) parts.push('쉬는 날');
    if (e.done) parts.push('끝냄');
    return parts.join(' · ');
  }

  function renderSelDay(t, list) {
    var box = $('cal-day');
    clear(box);
    var ds = ui.calSel;
    var d = dayOf(ds);
    var evs = sortEvents(d ? arr(d.events).filter(Boolean) : []);
    box.appendChild(sec(dayLabel(ds) + ' 일정', (ds === t ? '오늘 · ' : '') + evs.length + '건'));
    if (evs.length) {
      var tb = table(['58px', '', '48px']);
      var body = h('tbody');
      evs.forEach(function (e) {
        var tr = h('tr', e.done && e.src === 'mine' ? 'done' : '');
        tr.appendChild(td('tm' + (e.red ? ' hot' : ''), e.cont ? '이어짐' : (e.tm || '종일')));
        var c = td('');
        c.appendChild(h('span', 'ttl' + (e.red ? ' hot' : ''), e.t || '(제목 없음)'));
        var mini = eventMini(e);
        if (mini) c.appendChild(h('span', 'mini', mini));
        tr.appendChild(c);
        var c2 = td('');
        c2.appendChild(srcChip(e.src));
        tr.appendChild(c2);
        body.appendChild(tr);
      });
      tb.appendChild(body);
      box.appendChild(tb);
    } else {
      box.appendChild(empty('일정이 없습니다'));
    }
    var dayTodos = list.filter(function (x) {
      if (!isYmd(x.due)) return false;
      if (x.due === ds) return true;
      return isYmd(x.start) && x.start <= ds && ds < x.due;
    });
    if (dayTodos.length) {
      box.appendChild(h('div', 'sub-sec', '이 날 할 일 ' + dayTodos.length + '건'));
      dayTodos.forEach(function (x) { box.appendChild(todoRow(x, t)); });
    }
  }

  function renderUpcoming(t) {
    var box = $('cal-up');
    clear(box);
    var rows = [];
    for (var i = 1; i <= 14; i++) {
      var ds = addDays(t, i);
      var d = dayOf(ds);
      if (!d) continue;
      sortEvents(arr(d.events).filter(function (e) { return e && !e.cont; })).forEach(function (e) {
        rows.push({ ds: ds, e: e });
      });
    }
    box.appendChild(sec('다가오는 일정', '내일부터 14일 · ' + rows.length + '건'));
    if (!rows.length) { box.appendChild(empty('다가오는 일정이 없습니다')); return; }
    var tb = table(['56px', '50px', '', '48px']);
    var head = h('thead');
    var hr = h('tr');
    ['일자', '시각', '내용', '구분'].forEach(function (x) { hr.appendChild(h('th', '', x)); });
    head.appendChild(hr);
    tb.appendChild(head);
    var body = h('tbody');
    rows.slice(0, 8).forEach(function (r) {
      var e = r.e;
      var tr = h('tr', e.done && e.src === 'mine' ? 'done' : '');
      var c0 = td('tm' + (e.red ? ' hot' : ''), md(r.ds));
      c0.appendChild(h('span', 'mini', DOW[dowOf(r.ds)]));
      tr.appendChild(c0);
      tr.appendChild(td('tm', e.tm || '종일'));
      var c = td('');
      c.appendChild(h('span', 'ttl' + (e.red ? ' hot' : ''), e.t || '(제목 없음)'));
      var mini = eventMini(e);
      if (mini) c.appendChild(h('span', 'mini', mini));
      tr.appendChild(c);
      var c3 = td('');
      c3.appendChild(srcChip(e.src));
      tr.appendChild(c3);
      body.appendChild(tr);
    });
    tb.appendChild(body);
    box.appendChild(tb);
    if (rows.length > 8) box.appendChild(h('p', 'foot', '앞의 8건만 보입니다. 날짜를 눌러 나머지를 보세요.'));
  }

  function renderDday(t) {
    var box = $('cal-dday');
    clear(box);
    var list = arr(V().ddays).filter(function (x) { return x && isYmd(x.date); });
    box.appendChild(sec('D-DAY', list.length + '건'));
    if (!list.length) { box.appendChild(empty('D-Day가 없습니다')); return; }
    var tb = table(['66px', '', '56px']);
    var body = h('tbody');
    list.forEach(function (x) {
      var n = diff(t, x.date);
      var label = n === 0 ? 'D-DAY' : (n > 0 ? 'D-' + n : 'D+' + (-n));
      var tr = h('tr');
      tr.appendChild(td('tm' + (n >= 0 && n <= 7 ? ' hot' : ''), label));
      tr.appendChild(td('ttl', x.t || ''));
      tr.appendChild(td('tm sub', md(x.date)));
      body.appendChild(tr);
    });
    tb.appendChild(body);
    box.appendChild(tb);
  }

  // 할 일: 입력 줄이 목록 바로 위에 있다 → 추가한 줄이 입력칸 바로 밑에 보인다. 끝낸 것은 접어 둔다.
  function renderTodos(t, list) {
    var box = $('cal-todo');
    clear(box);
    var open = list.filter(function (x) { return !x.srcDone; });
    var done = list.filter(function (x) { return x.srcDone; });
    var left = list.filter(function (x) { return !x.done; }).length;
    $('todo-count').textContent = '남은 ' + left + ' / 전체 ' + list.length;
    if (!list.length) { box.appendChild(empty('할 일이 없습니다')); return; }
    open.forEach(function (x) { box.appendChild(todoRow(x, t)); });
    if (done.length) {
      var tg = btn('done-tog', null, function () { ui.showDone = !ui.showDone; renderCal(); });
      tg.setAttribute('aria-expanded', ui.showDone ? 'true' : 'false');
      tg.appendChild(h('span', '', '끝낸 할 일 ' + done.length + '건'));
      tg.appendChild(h('span', '', ui.showDone ? '접기' : '펼치기'));
      box.appendChild(tg);
      if (ui.showDone) done.forEach(function (x) { box.appendChild(todoRow(x, t)); });
    }
  }

  function dueLabel(x, t) {
    if (x.done) return { text: isYmd(x.doneAt) ? md(x.doneAt) + ' 완료' : '완료', cls: '' };
    if (!isYmd(x.due)) return null;
    var n = diff(t, x.due);
    if (n < 0) return { text: md(x.due) + ' 마감', cls: 'hot' };
    if (n === 0) return { text: '오늘', cls: 'today' };
    if (n === 1) return { text: '내일', cls: 'today' };
    return { text: md(x.due) + ' 마감', cls: '' };
  }

  function todoRow(x, t) {
    var b = btn('chk' + (x.done ? ' on' : ''), null, function () { onTodo(x); });
    b.setAttribute('role', 'checkbox');
    b.setAttribute('aria-checked', x.done ? 'true' : 'false');
    var col = x.cat && catColor(x.cat.c);
    if (col) b.style.borderLeftColor = col;
    b.appendChild(h('span', 'bx'));
    var lb = h('span', 'lb');
    lb.appendChild(h('span', 'lt', x.t || '(내용 없음)'));
    var meta = h('span', 'meta');
    if (x.cat && x.cat.nm) meta.appendChild(h('span', 'cat', x.cat.nm));
    if (x.rep) meta.appendChild(h('span', '', x.repLabel || '반복'));
    if (isYmd(x.start) && x.start > t && !x.done) meta.appendChild(h('span', '', md(x.start) + '부터'));
    if (x.mark) meta.appendChild(markEl(x.mark));
    if (meta.firstChild) lb.appendChild(meta);
    b.appendChild(lb);
    var due = dueLabel(x, t);
    if (due) b.appendChild(h('span', 'dt' + (due.cls ? ' ' + due.cls : ''), due.text));
    return b;
  }

  function onTodo(x) {
    if (x.isNew) { toast('PC에 반영된 뒤에 체크할 수 있습니다'); return; }
    if (!x.fp) return;
    if (x.rep) {
      if (x.srcDone) { toast('반복 할 일은 PC에서 되돌려 주세요'); return; }
      if (x.mark === 'next') { toast('이미 다음 회차로 넘김을 기다리고 있습니다'); return; }
      var pr = { fp: x.fp, on: true };
      if (x.due) pr.due = x.due;
      M.op('todo.done', pr);
      return;
    }
    var p = { fp: x.fp, on: !x.done };
    if (x.due) p.due = x.due;
    M.op('todo.done', p);
  }

  // 마감 빠른 고르기: 없음 · 오늘 · 내일 (날짜칸이 한 값만 가진다)
  function dueChips() {
    var v = $('todo-due').value;
    var t = today();
    Array.prototype.forEach.call(document.querySelectorAll('#todo-form .chip'), function (b) {
      var d = b.getAttribute('data-due');
      var target = d === '' ? '' : addDays(t, +d);
      b.setAttribute('aria-pressed', v === target ? 'true' : 'false');
    });
  }

  function addTodo() {
    var inp = $('todo-t');
    var t = inp.value.replace(/\s+/g, ' ').trim();
    var due = $('todo-due').value;
    if (!t) {
      // 방금 추가한 직후의 두 번 누름은 조용히 넘긴다(입력칸은 이미 비었음).
      // 단추를 잠그면 Enter로 빠르게 이어 적는 것까지 막히므로 잠그지 않는다.
      if (Date.now() - (ui.lastAddAt || 0) < 1200) return;
      formErr('todo-err', '할 일 내용을 적어 주세요');
      inp.focus();
      return;
    }
    if (t.length > 200) { formErr('todo-err', '할 일은 200자까지 적을 수 있습니다'); return; }
    var p = { t: t };
    if (isYmd(due)) p.due = due;
    var keep = ui.refocusTodo || document.activeElement === inp;
    ui.refocusTodo = false;
    ui.lastAddAt = Date.now();
    M.op('todo.add', p);
    inp.value = '';
    $('todo-due').value = '';
    dueChips();
    formErr('todo-err', '');
    toast('할 일을 적었습니다 · PC 반영 대기');
    // 키보드가 올라와 있었으면 그대로 다음 할 일을 이어 적게
    if (keep) inp.focus();
  }

  // ── 2) 오늘 ─────────────────────────────
  function renderToday() {
    var t = today();
    var from = rangeFrom(), to = rangeTo();
    if (!ui.tdDay) ui.tdDay = clampDay(t, from, to);
    ui.tdDay = clampDay(ui.tdDay, from, to);
    var ds = ui.tdDay;
    dayBar($('td-bar'), ds, t, from, to, function (d) { ui.tdDay = d; renderToday(); });
    var d = dayOf(ds) || {};
    var periods = arr(d.periods).filter(function (p) { return p && !isNaN(toMin(p.s)) && !isNaN(toMin(p.e)); })
      .slice().sort(function (a, b) { return toMin(a.s) - toMin(b.s); });
    var nowBox = $('td-now');
    clear(nowBox);
    if (ds === t) nowBox.appendChild(nowPanel(periods, new Date()));
    renderTimetable(ds, t, d, periods);
    renderMeal(d);
    renderProg(d);
    renderOt();
  }

  function dayBar(box, ds, t, min, max, go) {
    clear(box);
    var bar = h('div', 'mbar');
    var prev = iconBtn('mbtn l', 'left', '이전 날', function () { go(addDays(ds, -1)); });
    prev.disabled = ds <= min;
    var mid = h('div', 'mid');
    mid.appendChild(h('span', 'ym', dayLabel(ds)));
    mid.appendChild(h('span', 'lg' + (ds === t ? ' hot' : ''), relDay(t, ds)));
    bar.appendChild(prev);
    bar.appendChild(mid);
    if (ds !== t && t >= min && t <= max) bar.appendChild(btn('mgo', '오늘', function () { go(t); }));
    var next = iconBtn('mbtn r', 'right', '다음 날', function () { go(addDays(ds, 1)); });
    next.disabled = ds >= max;
    bar.appendChild(next);
    box.appendChild(bar);
  }

  function pName(p) {
    if (!p) return '';
    if (p.lunch) return '점심' + (p.nm ? ' ' + p.nm : '');
    return p.p + '교시 ' + (p.subj || '공강');
  }

  function nowInfo(ps, now) {
    if (!ps.length) return { kind: 'none' };
    var sec2 = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    var first = ps[0];
    if (sec2 < toMin(first.s) * 60) return { kind: 'before', next: first, left: Math.ceil((toMin(first.s) * 60 - sec2) / 60) };
    for (var i = 0; i < ps.length; i++) {
      var s = toMin(ps[i].s) * 60, e = toMin(ps[i].e) * 60;
      if (sec2 >= s && sec2 < e) {
        return { kind: ps[i].lunch ? 'lunch' : 'period', cur: ps[i], next: ps[i + 1] || null, ratio: (sec2 - s) / (e - s), left: Math.ceil((e - sec2) / 60) };
      }
      if (i + 1 < ps.length) {
        var ns = toMin(ps[i + 1].s) * 60;
        if (sec2 >= e && sec2 < ns) {
          return { kind: 'break', prev: ps[i], next: ps[i + 1], ratio: (sec2 - e) / (ns - e), left: Math.ceil((ns - sec2) / 60) };
        }
      }
    }
    var lastClass = ps.filter(function (p) { return !p.lunch; }).pop() || ps[ps.length - 1];
    return { kind: 'after', last: lastClass };
  }

  function nowPanel(ps, now) {
    var info = nowInfo(ps, now);
    var pan = h('div', 'nowpan');
    pan.setAttribute('role', 'status');
    var big = h('div', 'big');
    var body = h('div', 'body');
    var n, u, sj, rg, ratio = -1, left = null, right = null;
    if (info.kind === 'period') {
      n = String(info.cur.p); u = '교시';
      sj = info.cur.subj || '공강';
      rg = info.cur.s + ' – ' + info.cur.e;
      ratio = info.ratio;
      left = ['남은 ', fmtMin(info.left)];
      right = info.next ? '다음 ' + pName(info.next) + ' ' + info.next.s : '마지막 수업';
    } else if (info.kind === 'lunch') {
      n = '점심'; u = '';
      sj = '점심 시간';
      rg = info.cur.s + ' – ' + info.cur.e;
      ratio = info.ratio;
      left = ['남은 ', fmtMin(info.left)];
      right = info.next ? '다음 ' + pName(info.next) + ' ' + info.next.s : '';
    } else if (info.kind === 'break') {
      n = '–'; u = '쉬는 시간';
      sj = '쉬는 시간';
      rg = '다음 ' + pName(info.next) + ' ' + info.next.s;
      ratio = info.ratio;
      left = ['', fmtMin(info.left) + ' 뒤 시작'];
    } else if (info.kind === 'before') {
      n = '–'; u = '수업 전';
      sj = '첫 수업 ' + info.next.s;
      rg = pName(info.next);
      left = ['', fmtMin(info.left) + ' 뒤 시작'];
    } else if (info.kind === 'after') {
      n = '끝'; u = '';
      sj = '오늘 수업 끝';
      rg = info.last ? pName(info.last) + ' ' + info.last.e + ' 끝남' : '';
    } else {
      n = '–'; u = '';
      sj = '시간표 없음';
      rg = '이 날은 PC 시간표에 수업이 없습니다';
    }
    big.appendChild(h('div', 'n' + (/^\d+$/.test(n) || n === '–' ? '' : ' tx'), n));
    if (u) big.appendChild(h('div', 'u', u));
    body.appendChild(h('div', 'sj', sj));
    if (rg) body.appendChild(h('div', 'rg' + (info.kind === 'period' || info.kind === 'lunch' ? '' : ' sans'), rg));
    if (ratio >= 0) {
      var bar = h('div', 'pgb');
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      var fill = h('i');
      fill.style.width = Math.max(0, Math.min(100, ratio * 100)).toFixed(1) + '%';
      bar.appendChild(fill);
      body.appendChild(bar);
    }
    if (left || right) {
      var rw = h('div', 'rw');
      if (left) {
        var ls = h('span', '', left[0]);
        ls.appendChild(h('b', '', left[1]));
        rw.appendChild(ls);
      }
      if (right) rw.appendChild(h('span', '', right));
      body.appendChild(rw);
    }
    pan.appendChild(big);
    pan.appendChild(body);
    return pan;
  }

  function renderTimetable(ds, t, d, ps) {
    var box = $('td-tt');
    clear(box);
    box.appendChild(sec('시간표', d.ttNote || '', !!d.ttNote));
    if (!ps.length) { box.appendChild(empty('이 날은 시간표가 없습니다')); return; }
    var nowSec = -1;
    if (ds === t) { var n = new Date(); nowSec = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds(); }
    var tb = table(['40px', '104px', '', '48px']);
    var head = h('thead');
    var hr = h('tr');
    ['교시', '시각', '과목', '상태'].forEach(function (x) { hr.appendChild(h('th', '', x)); });
    head.appendChild(hr);
    tb.appendChild(head);
    var body = h('tbody');
    ps.forEach(function (p) {
      var s = toMin(p.s) * 60, e = toMin(p.e) * 60;
      var st;
      if (ds < t) st = '종료';
      else if (ds > t) st = '대기';
      else st = nowSec >= e ? '종료' : (nowSec >= s ? '진행' : '대기');
      var cur = st === '진행';
      var tr = h('tr', (p.lunch ? 'shade' : '') + (cur ? ' cur' : ''));
      tr.appendChild(td('tm' + (cur ? ' hot rulL' : ''), p.lunch ? '' : p.p));
      tr.appendChild(td('tm' + (cur ? ' hot' : ''), p.s + '–' + p.e));
      var subj = p.lunch ? '점심' + (p.nm ? ' · ' + p.nm : '') : (p.subj || '공강');
      tr.appendChild(td((cur ? 'ttl hot' : '') + (!p.lunch && !p.subj ? ' sub' : ''), subj));
      tr.appendChild(td('sub' + (cur ? ' hot' : ''), st));
      body.appendChild(tr);
    });
    tb.appendChild(body);
    box.appendChild(tb);
  }

  function renderMeal(d) {
    var box = $('td-meal');
    clear(box);
    var meals = arr(d.meal).filter(function (x) { return x && arr(x.items).length; });
    if (!meals.length) {
      box.appendChild(sec('급식'));
      box.appendChild(empty('급식 정보가 없습니다'));
      return;
    }
    meals.forEach(function (meal) {
      box.appendChild(sec('급식', meal.nm || ''));
      var tb = table(['', '96px']);
      var head = h('thead');
      var hr = h('tr');
      hr.appendChild(h('th', '', '품목'));
      hr.appendChild(h('th', '', '알레르기'));
      head.appendChild(hr);
      tb.appendChild(head);
      var body = h('tbody');
      arr(meal.items).forEach(function (it) {
        var tr = h('tr');
        tr.appendChild(td('', it.n || ''));
        tr.appendChild(td('tm sub', it.al || '–'));
        body.appendChild(tr);
      });
      tb.appendChild(body);
      box.appendChild(tb);
      if (meal.kcal) {
        var k = h('div', 'kcal');
        k.appendChild(h('span', '', meal.kcal));
        box.appendChild(k);
      }
    });
    box.appendChild(h('p', 'foot', '알레르기 열의 숫자는 유발식품 번호입니다.'));
  }

  var PROG_KO = { done: '기록', plan: '예정', off: '휴강' };
  function renderProg(d) {
    var box = $('td-prog');
    clear(box);
    var list = arr(d.prog).filter(Boolean).slice().sort(function (a, b) { return (a.p || 0) - (b.p || 0); });
    box.appendChild(sec('진도', list.length + '건'));
    if (!list.length) { box.appendChild(empty('이 날 진도가 없습니다')); return; }
    var tb = table(['40px', '', '52px']);
    var body = h('tbody');
    list.forEach(function (x) {
      var tr = h('tr');
      tr.appendChild(td('tm', x.p));
      var c = td('');
      c.appendChild(h('span', 'ttl', x.cls || ''));
      var mini = [];
      if (x.n) mini.push(x.n + '차시');
      if (x.txt) mini.push(x.txt);
      if (mini.length) c.appendChild(h('span', 'mini', mini.join(' · ')));
      tr.appendChild(c);
      var c2 = td('');
      var st = PROG_KO[x.state] ? x.state : 'plan';
      c2.appendChild(h('span', 'src ' + (st === 'done' ? 'mine' : (st === 'off' ? 'off' : 'sched')), PROG_KO[st]));
      tr.appendChild(c2);
      body.appendChild(tr);
    });
    tb.appendChild(body);
    box.appendChild(tb);
  }

  function renderOt() {
    var box = $('td-ot');
    clear(box);
    var ot = V().ot;
    if (!ot || typeof ot.min !== 'number') return;
    var mon = typeof ot.month === 'string' ? ot.month : '';
    box.appendChild(sec('초과근무', mon));
    var row = h('div', 'ot');
    var thisMonth = mon === today().slice(0, 7);
    row.appendChild(h('span', '', thisMonth || !mon ? '이번 달' : (+mon.slice(5, 7)) + '월'));
    var mm = Math.max(0, Math.round(ot.min));
    row.appendChild(h('b', '', Math.floor(mm / 60) + '시간 ' + (mm % 60) + '분'));
    box.appendChild(row);
  }

  // ── 3) 메모 ─────────────────────────────
  function renderMemo() {
    var box = $('memo-list');
    clear(box);
    var list = dispMemos();
    if (!list.length) {
      box.appendChild(sec('메모', '0건'));
      box.appendChild(empty('메모가 없습니다'));
      return;
    }
    var groups = [], idx = {};
    list.forEach(function (m) {
      if (!Object.prototype.hasOwnProperty.call(idx, m.card)) {
        idx[m.card] = groups.length;
        groups.push({ card: m.card, items: [] });
      }
      groups[idx[m.card]].items.push(m);
    });
    groups.forEach(function (g) {
      box.appendChild(sec(g.card, g.items.length + '건'));
      var wrap = h('div');
      g.items.forEach(function (m) {
        var r = h('div', 'memo');
        var col = catColor(m.c);
        if (col) r.style.borderLeftColor = col;
        r.appendChild(h('p', 'tx', m.t));
        if (m.mark) {
          var mt = h('div', 'mt');
          mt.appendChild(markEl(m.mark));
          r.appendChild(mt);
        }
        wrap.appendChild(r);
      });
      box.appendChild(wrap);
    });
  }

  function addMemo() {
    var b = $('memo-add');
    if (b.disabled) return;
    var t = $('memo-t').value.replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, '');
    if (!t) { formErr('memo-err', '메모 내용을 적어 주세요'); $('memo-t').focus(); return; }
    if (t.length > 2000) { formErr('memo-err', '메모는 2000자까지 적을 수 있습니다'); return; }
    lock(b);
    M.op('memo.add', { t: t });
    $('memo-t').value = '';
    $('memo-t').blur();
    formErr('memo-err', '');
    toast('메모를 적었습니다 · PC 반영 대기');
  }

  // ── 4) 학생: 반 고르기 → 날짜 → 명렬(한 명 누르기 / 여러 명 선택) ──
  function stuBounds(t) {
    var a = addDays(t, -45), b = addDays(t, 7);
    var f = rangeFrom(), to = rangeTo();
    return [a < f ? f : a, b > to ? to : b];
  }
  function selKeys() {
    if (!ui.sel) return [];
    var c = clsOf(ui.sel.cls);
    if (!c) return [];
    return sortedStudents(c).filter(function (s) { return ui.sel.keys[s.key]; }).map(function (s) { return s.key; });
  }

  function renderStu() {
    var m = attendModel();
    if (!m || !m.classes.length) return;
    var t = today();
    if (!clsOf(ui.stuCls)) { ui.stuCls = defaultCls(m); ui.sel = null; }
    if (ui.sel && ui.sel.cls !== ui.stuCls) ui.sel = null;
    var c = clsOf(ui.stuCls);
    var bd = stuBounds(t);
    if (!ui.stuDay) ui.stuDay = t;
    ui.stuDay = clampDay(ui.stuDay, bd[0], bd[1]);
    var ds = ui.stuDay;

    renderClsBar(m);
    dayBar($('stu-bar'), ds, t, bd[0], bd[1], function (d) { ui.stuDay = d; ui.clearArm = 0; renderStu(); });

    var box = $('stu-list');
    clear(box);
    var studs = sortedStudents(c);
    var counts = {}, order = [];
    var rows = studs.map(function (st) {
      var a = attRec(c.cls, ds, st.key);
      if (a.rec && a.rec.k) {
        if (!counts[a.rec.k]) { counts[a.rec.k] = 0; order.push(a.rec.k); }
        counts[a.rec.k]++;
      }
      return { st: st, a: a, talk: talkList(c.cls, st.key, st.name).length };
    });
    var summary = order.length ? order.map(function (k) { return k + ' ' + counts[k]; }).join(' · ') : '모두 출석';
    box.appendChild(sec(c.cls + ' 출결 · ' + dayLabel(ds), summary, order.length > 0));

    var tool = h('div', 'tool');
    if (!ui.sel) {
      tool.appendChild(h('span', 'tx', '학생을 누르면 출결·상담을 적습니다'));
      tool.appendChild(btn('tbtn2', '여러 명 선택', function () {
        ui.sel = { cls: c.cls, keys: {} };
        ui.clearArm = 0;
        renderStu();
      }));
    } else {
      var n = selKeys().length;
      var all = n > 0 && n === studs.length;
      tool.appendChild(h('span', 'tx on', n + '명 선택'));
      tool.appendChild(btn('tbtn2', all ? '전체 해제' : '전체 선택', function () {
        ui.sel.keys = {};
        if (!all) studs.forEach(function (s) { ui.sel.keys[s.key] = true; });
        ui.clearArm = 0;
        renderStu();
      }));
      tool.appendChild(btn('tbtn2', '끝내기', function () { ui.sel = null; ui.clearArm = 0; renderStu(); }));
    }
    box.appendChild(tool);

    if (!studs.length) { box.appendChild(empty('이 반 명렬이 없습니다')); renderActbar(true); return; }
    var hd = h('div', 'ros-h');
    hd.setAttribute('aria-hidden', 'true');
    if (ui.sel) hd.appendChild(h('span', 'bxh', ''));
    hd.appendChild(h('span', 'no', '번호'));
    hd.appendChild(h('span', '', '이름'));
    hd.appendChild(h('span', 'sm', '출결'));
    box.appendChild(hd);

    rows.forEach(function (r) {
      var st = r.st, a = r.a;
      var b;
      var label = st.no + '번 ' + st.name + ', ' + recText(a.rec) + (a.mark ? ', ' + MARK[a.mark] : '') + (r.talk ? ', 상담 ' + r.talk + '건' : '');
      if (ui.sel) {
        var on = !!ui.sel.keys[st.key];
        b = btn('ros', null, function () {
          if (ui.sel.keys[st.key]) delete ui.sel.keys[st.key];
          else ui.sel.keys[st.key] = true;
          ui.clearArm = 0;
          renderStu();
        });
        b.setAttribute('role', 'checkbox');
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.appendChild(h('span', 'bx'));
      } else {
        b = btn('ros', null, function () { openSheetOne(c.cls, st.key, ds); });
      }
      b.appendChild(h('span', 'no', st.no));
      b.appendChild(h('span', 'nm', st.name));
      var sm = h('span', 'sm' + (a.rec ? '' : ' gray'), recText(a.rec));
      if (a.mark) sm.appendChild(markEl(a.mark, true));
      b.appendChild(sm);
      if (r.talk) b.appendChild(h('span', 'tk', '상담 ' + r.talk));
      if (!ui.sel) b.appendChild(icon('right'));
      b.setAttribute('aria-label', label);
      box.appendChild(b);
    });
    renderActbar(true);
  }

  function renderClsBar(m) {
    var box = $('stu-cls');
    clear(box);
    var bar = h('div', 'clsbar');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '반 고르기');
    m.classes.forEach(function (c) {
      var b = btn('clsb', null, function () {
        if (ui.stuCls !== c.cls) {
          ui.stuCls = c.cls;
          ui.sel = null;
          ui.clearArm = 0;
        }
        renderStu();
      });
      var n = arr(c.students).length;
      b.setAttribute('aria-pressed', c.cls === ui.stuCls ? 'true' : 'false');
      b.setAttribute('aria-label', c.cls + (c.hr ? ' 담임반' : '') + ', ' + n + '명');
      b.appendChild(h('span', 'cn', c.cls));
      var cm = h('span', 'cm');
      if (c.hr) cm.appendChild(h('span', 'hr', '담임'));
      cm.appendChild(h('span', '', n + '명'));
      b.appendChild(cm);
      bar.appendChild(b);
    });
    box.appendChild(bar);
  }

  // 여러 명 선택 때만 아래 탭 자리에 뜨는 단추 줄
  function renderActbar(ready) {
    var on = !!(ready && ui.sel && ui.tab === 'stu' && !ui.overlay && clsOf(ui.sel.cls));
    $('actbar').hidden = !on;
    document.body.classList.toggle('sel-mode', on);
    if (!on) return;
    var n = selKeys().length;
    var armed = ui.clearArm && Date.now() < ui.clearArm;
    var bc = $('act-clear'), bs = $('act-set');
    bc.textContent = armed ? '한 번 더: ' + n + '명 출석으로' : n + '명 출석으로';
    bc.classList.toggle('arm', !!armed);
    bs.textContent = n + '명 출결 입력';
    bc.disabled = n === 0;
    bs.disabled = n === 0;
  }

  function onActClear() {
    if (!ui.sel) return;
    var keys = selKeys();
    if (!keys.length) return;
    if (!(ui.clearArm && Date.now() < ui.clearArm)) {
      ui.clearArm = Date.now() + 4000;
      renderActbar(isReady());
      setTimeout(function () { renderActbar(isReady()); }, 4100);
      return;
    }
    ui.clearArm = 0;
    var cls = ui.sel.cls;
    M.op('attend.clearMany', { cls: cls, date: ui.stuDay, keys: keys });
    ui.sel = null;
    toast(cls + ' ' + keys.length + '명 출석으로 되돌렸습니다 · PC 반영 대기');
    renderStu();
  }

  // ── 학생 시트(한 명 / 여러 명) ──────────
  function openSheetOne(cls, key, date) {
    var c = clsOf(cls);
    var st = stuIn(c, key);
    if (!st || ui.overlay) return;
    var a = attRec(cls, date, key);
    ui.sheet = {
      mode: 'one', cls: cls, key: key, name: st.name, date: date,
      g: a.rec ? (a.rec.g || '') : '',
      k: a.rec ? (a.rec.k || '') : '',
      p: a.rec ? arr(a.rec.p).slice() : [],
      why: a.rec ? String(a.rec.why || '') : ''
    };
    showSheet();
  }
  function openSheetMany() {
    var keys = selKeys();
    if (!keys.length || ui.overlay) return;
    ui.clearArm = 0;
    ui.sheet = { mode: 'many', cls: ui.sel.cls, keys: keys, date: ui.stuDay, g: '', k: '', p: [], why: '' };
    showSheet();
  }
  function showSheet() {
    var sh = ui.sheet;
    var many = sh.mode === 'many';
    $('sh-why').value = sh.why;
    $('sh-td').value = sh.date;
    $('sh-tt').value = '';
    formErr('sh-err', '');
    formErr('sh-terr', '');
    $('sh-names').hidden = !many;
    $('sh-clear').hidden = many;
    $('sh-talk-wrap').hidden = many;
    $('sh-warn').hidden = true;
    var el = $('sheet');
    el.hidden = false;
    el.scrollTop = 0;
    openOverlay('sheet');
    renderSheetEditor();
    renderSheetLive();
    $('sh-close').focus();
  }

  function openOverlay(name) {
    ui.overlay = name;
    document.body.classList.add('sheet-open');
    document.body.classList.remove('kb');
    try {
      window.history.pushState({ td2ov: name }, '');
      ui.pushed = true;
    } catch (e) { ui.pushed = false; }
    renderActbar(isReady());
  }
  function closeOverlay(fromPop) {
    if (!ui.overlay) return;
    var was = ui.overlay;
    $(was === 'opt' ? 'opt' : 'sheet').hidden = true;
    ui.overlay = null;
    ui.sheet = null;
    ui.logoutArm = 0;
    document.body.classList.remove('sheet-open');
    if (!fromPop && ui.pushed) {
      ui.pushed = false;
      ui.ignorePop = true;
      try { window.history.back(); } catch (e) { ui.ignorePop = false; }
    } else {
      ui.pushed = false;
    }
    if (was === 'opt' && !$('btn-opt').hidden) $('btn-opt').focus();
    schedule();
  }

  function defaultSlots(k, slots) {
    var ids = slots.map(function (s) { return s.id; });
    if (k === '결석') return ids;
    if (k === '지각') return ids.slice(0, 2);
    if (k === '조퇴') return ids.slice(-2);
    return [];
  }
  function segButtons(box, items, cur, pick) {
    clear(box);
    box.style.gridTemplateColumns = 'repeat(' + Math.max(1, items.length) + ', minmax(0, 1fr))';
    items.forEach(function (val) {
      var b = btn('', val, function () { pick(val); });
      b.setAttribute('aria-pressed', val === cur ? 'true' : 'false');
      box.appendChild(b);
    });
  }
  function renderSheetEditor() {
    var sh = ui.sheet;
    var m = attendModel();
    if (!sh || !m) return;
    segButtons($('sh-g'), m.gubun, sh.g, function (val) { sh.g = val; formErr('sh-err', ''); renderSheetEditor(); });
    segButtons($('sh-k'), m.jong, sh.k, function (val) {
      if (sh.k !== val) { sh.k = val; sh.p = defaultSlots(val, m.slots); }
      formErr('sh-err', '');
      renderSheetEditor();
    });
    var pb = $('sh-p');
    clear(pb);
    m.slots.forEach(function (sl) {
      var b = btn('', sl.nm || sl.id, function () {
        var i = sh.p.indexOf(sl.id);
        if (i >= 0) sh.p.splice(i, 1); else sh.p.push(sl.id);
        formErr('sh-err', '');
        renderSheetEditor();
      });
      b.setAttribute('aria-pressed', sh.p.indexOf(sl.id) >= 0 ? 'true' : 'false');
      pb.appendChild(b);
    });
  }

  function renderSheetLive() {
    var sh = ui.sheet;
    if (!sh) return;
    var c = clsOf(sh.cls);
    if (!c) { closeOverlay(); return; }
    var now = $('sh-now');
    clear(now);
    if (sh.mode === 'one') {
      var st = stuIn(c, sh.key);
      if (!st) { closeOverlay(); return; }
      $('sh-title').textContent = c.cls + ' · ' + st.no + ' ' + st.name + ' · ' + dayLabel(sh.date);
      var a = attRec(c.cls, sh.date, sh.key);
      now.appendChild(h('span', '', '지금 ' + recText(a.rec)));
      if (a.mark) now.appendChild(markEl(a.mark));
      $('sh-clear').disabled = !a.rec;
      renderTalk(c, st);
      return;
    }
    var list = sh.keys.map(function (k) { return stuIn(c, k); }).filter(Boolean);
    if (!list.length) { closeOverlay(); return; }
    $('sh-title').textContent = c.cls + ' · ' + list.length + '명 · ' + dayLabel(sh.date);
    $('sh-names').textContent = list.map(function (s) { return s.no + ' ' + s.name; }).join(', ');
    var had = list.filter(function (s) { return !!attRec(c.cls, sh.date, s.key).rec; });
    now.appendChild(h('span', '', had.length ? '기록 있음 ' + had.length + '명' : '모두 출석'));
    var warn = $('sh-warn');
    warn.hidden = !had.length;
    warn.textContent = had.length ? '이미 기록이 있는 ' + had.length + '명(' + had.map(function (s) { return s.name; }).join(', ') + ')은 새로 고른 값으로 바뀝니다.' : '';
  }

  function renderTalk(c, st) {
    var list = talkList(c.cls, st.key, st.name);
    $('sh-talk-n').textContent = list.length + '건';
    var box = $('sh-talk');
    clear(box);
    if (!list.length) { box.appendChild(empty('상담기록이 없습니다')); return; }
    var wrap = h('div');
    list.forEach(function (x) {
      var r = h('div', 'talk');
      var top = h('div', 'talk-d');
      top.appendChild(h('span', '', isYmd(x.d) ? x.d.slice(0, 4) + '-' + dayLabel(x.d) : (x.d || '')));
      if (x.mark) top.appendChild(markEl(x.mark));
      r.appendChild(top);
      r.appendChild(h('p', 'tx', x.t));
      wrap.appendChild(r);
    });
    box.appendChild(wrap);
  }

  function sameRec(a, b) {
    return a && b && a.g === b.g && a.k === b.k && String(a.why || '') === String(b.why || '') &&
      arr(a.p).join(',') === arr(b.p).join(',');
  }

  function saveAttend() {
    var sh = ui.sheet;
    var m = attendModel();
    if (!sh || !m) return;
    var b = $('sh-save');
    if (b.disabled) return;
    sh.why = $('sh-why').value.replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!sh.g) { formErr('sh-err', '구분을 고르세요'); return; }
    if (!sh.k) { formErr('sh-err', '종류를 고르세요'); return; }
    if (!sh.p.length) { formErr('sh-err', '교시를 하나 이상 고르세요'); return; }
    var order = m.slots.map(function (s) { return s.id; });
    var rec = { g: sh.g, k: sh.k, why: sh.why, p: order.filter(function (id) { return sh.p.indexOf(id) >= 0; }) };
    if (sh.mode === 'many') {
      lock(b);
      M.op('attend.setMany', { cls: sh.cls, date: sh.date, keys: sh.keys.slice(), rec: rec });
      toast(sh.cls + ' ' + sh.keys.length + '명 출결을 적었습니다 · PC 반영 대기');
      ui.sel = null;
      closeOverlay();
      return;
    }
    if (sameRec(attRec(sh.cls, sh.date, sh.key).rec, rec)) { toast('바뀐 것이 없습니다'); return; }
    lock(b);
    M.op('attend.set', { cls: sh.cls, date: sh.date, key: sh.key, rec: rec });
    toast(sh.name + ' 출결을 적었습니다 · PC 반영 대기');
    closeOverlay();
  }

  function clearAttend() {
    var sh = ui.sheet;
    if (!sh || sh.mode !== 'one') return;
    var b = $('sh-clear');
    if (b.disabled || !attRec(sh.cls, sh.date, sh.key).rec) return;
    lock(b);
    M.op('attend.clear', { cls: sh.cls, date: sh.date, key: sh.key });
    toast(sh.name + ' 출석으로 되돌렸습니다 · PC 반영 대기');
    closeOverlay();
  }

  function addTalk() {
    var sh = ui.sheet;
    if (!sh || sh.mode !== 'one') return;
    var b = $('sh-tadd');
    if (b.disabled) return;
    var d = $('sh-td').value;
    var t = $('sh-tt').value.replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, '');
    if (!isYmd(d)) { formErr('sh-terr', '상담 날짜를 고르세요'); return; }
    if (!t) { formErr('sh-terr', '상담 내용을 적어 주세요'); $('sh-tt').focus(); return; }
    if (t.length > 1000) { formErr('sh-terr', '상담 내용은 1000자까지 적을 수 있습니다'); return; }
    lock(b);
    M.op('snote.add', { cls: sh.cls, name: sh.name, d: d, t: t });
    $('sh-tt').value = '';
    $('sh-tt').blur();
    formErr('sh-terr', '');
    toast('상담기록을 적었습니다 · PC 반영 대기');
  }

  // ── 설정 ────────────────────────────────
  function openOptions() {
    if (!PR || ui.overlay) return;
    PR.loadAllFonts();
    ui.logoutArm = 0;
    renderOptPrefs();
    renderOptAcct();
    var el = $('opt');
    el.hidden = false;
    el.scrollTop = 0;
    openOverlay('opt');
    $('opt-close').focus();
  }

  function radioGroup(cls, label, items, cur, onPick, build) {
    var g = h('div', cls);
    g.setAttribute('role', 'radiogroup');
    g.setAttribute('aria-label', label);
    items.forEach(function (it) {
      var b = btn('', null, function () { onPick(it.id); });
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', it.id === cur ? 'true' : 'false');
      b.setAttribute('data-id', it.id);
      build(b, it);
      g.appendChild(b);
    });
    return g;
  }
  function nameOf(list, id) {
    var x = list.filter(function (i) { return i.id === id; })[0];
    return x ? x.nm : '';
  }
  function pickPref(patch) {
    setPref(patch);
    renderOptPrefs();
    schedule();
  }

  function renderOptPrefs() {
    var box = $('opt-prefs');
    clear(box);
    var p = prefs();

    box.appendChild(sec('화면 색', nameOf(PR.THEMES, p.theme)));
    box.appendChild(radioGroup('opt-grid th', '화면 색', PR.THEMES, p.theme, function (id) { pickPref({ theme: id }); }, function (b, it) {
      b.className = 'pick thb';
      var sw = h('span', 'sw');
      sw.setAttribute('data-t', it.id);
      sw.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 4; i++) sw.appendChild(h('i'));
      b.appendChild(sw);
      b.appendChild(h('span', '', it.nm));
    }));

    box.appendChild(sec('강조색', nameOf(PR.ACCENTS, p.accent)));
    box.appendChild(radioGroup('opt-grid c3', '강조색', PR.ACCENTS, p.accent, function (id) { pickPref({ accent: id }); }, function (b, it) {
      b.className = 'pick acb';
      var i = h('i');
      i.setAttribute('aria-hidden', 'true');
      b.appendChild(i);
      b.appendChild(h('span', '', it.nm));
    }));

    box.appendChild(sec('글씨체', nameOf(PR.FONTS, p.font)));
    box.appendChild(radioGroup('opt-grid c1', '글씨체', PR.FONTS, p.font, function (id) { pickPref({ font: id }); }, function (b, it) {
      b.className = 'pick fnb';
      b.appendChild(h('span', 'pv ff-' + it.id, '가나다 출결 09:50'));
      b.appendChild(h('span', 'nt', it.nm + ' · ' + it.note));
    }));
    box.appendChild(h('p', 'opt-foot', '글꼴을 받지 못하면 기기 기본 글꼴로 보입니다.'));

    box.appendChild(sec('글자 크기', nameOf(PR.SIZES, p.size)));
    box.appendChild(radioGroup('segr', '글자 크기', PR.SIZES, p.size, function (id) { pickPref({ size: id }); }, function (b, it) {
      b.textContent = it.nm;
    }));

    box.appendChild(sec('첫 화면', nameOf(PR.STARTS, p.start)));
    var starts = radioGroup('segr', '첫 화면', PR.STARTS, p.start, function (id) { pickPref({ start: id }); }, function (b, it) {
      b.textContent = it.nm;
    });
    starts.style.gridTemplateColumns = 'repeat(' + PR.STARTS.length + ', minmax(0, 1fr))';
    box.appendChild(starts);
    box.appendChild(h('p', 'opt-foot', '«마지막»은 지난번에 보던 탭으로 엽니다.'));

    var rs = h('div', 'opt-reset');
    rs.appendChild(btn('obtn', '화면 설정 처음대로', function () {
      if (PR) PR.reset();
      renderOptPrefs();
      schedule();
      toast('화면 설정을 처음대로 되돌렸습니다');
    }));
    box.appendChild(rs);
  }

  function renderOptAcct() {
    var box = $('opt-acct');
    clear(box);
    var s = S();
    var v = s.view;
    box.appendChild(sec('계정'));
    var a = h('div', 'acct2');
    a.appendChild(h('p', 'mail', s.email ? s.email : '로그인하지 않았습니다'));
    if (s.email || s.phase === 'ready') {
      var act = pend().filter(isActive).length;
      var armed = ui.logoutArm && Date.now() < ui.logoutArm;
      if (act) a.appendChild(h('p', 'warn-tx', 'PC에 아직 반영되지 않은 입력이 ' + act + '건 있습니다. 로그아웃하면 이 폰에서 사라질 수 있습니다.'));
      a.appendChild(btn('obtn' + (armed ? ' arm' : ''), armed ? '한 번 더 누르면 로그아웃' : '로그아웃', onLogout));
    }
    box.appendChild(a);

    box.appendChild(sec('정보'));
    var rows = [];
    rows.push(['PC 이름', v && v.dev ? v.dev : '–']);
    rows.push(['PC 판', v && v.ver ? v.ver : '–']);
    var at = v ? Date.parse(v.at) : NaN;
    rows.push(['PC가 올린 시각', isNaN(at) ? '–' : ymd(new Date(at)) + ' ' + hm(new Date(at)) + ' · ' + ago(Date.now() - at)]);
    rows.push(['폰이 받은 시각', s.viewAt ? hm(new Date(s.viewAt)) + ' · ' + ago(Date.now() - s.viewAt) : '–']);
    rows.push(['폰 화면 판', UI_VER]);
    var tb = table(['112px', ''], 'info');
    var body = h('tbody');
    rows.forEach(function (r) {
      var tr = h('tr');
      tr.appendChild(td('', r[0]));
      tr.appendChild(td(/시각|판/.test(r[0]) ? 'tm' : '', r[1]));
      body.appendChild(tr);
    });
    tb.appendChild(body);
    box.appendChild(tb);
  }

  function onLogout() {
    var act = pend().filter(isActive).length;
    if (act && !(ui.logoutArm && Date.now() < ui.logoutArm)) {
      ui.logoutArm = Date.now() + 5000;
      renderOptAcct();
      setTimeout(function () { if (ui.overlay === 'opt') renderOptAcct(); }, 5100);
      return;
    }
    ui.logoutArm = 0;
    closeOverlay();
    M.logout();
  }

  // ── PC 반영 대기 띠 ─────────────────────
  var TYPE_KO = {
    'todo.add': '할 일 추가', 'todo.done': '할 일 체크', 'memo.add': '메모',
    'attend.set': '출결', 'attend.clear': '출결 되돌림',
    'attend.setMany': '출결 · 여러 명', 'attend.clearMany': '출석으로 · 여러 명',
    'snote.add': '상담기록'
  };
  function firstLine(s) {
    var t = String(s || '').split('\n')[0];
    return t.length > 40 ? t.slice(0, 40) + '…' : t;
  }
  function opText(o) {
    var p = o.p || {};
    var pre = p.cls ? p.cls + ' ' : '';
    switch (o.type) {
      case 'todo.add': return firstLine(p.t) + (isYmd(p.due) ? ' · ' + md(p.due) + ' 마감' : '');
      case 'todo.done': {
        var v = V();
        var t0 = v ? arr(v.todos).filter(function (x) { return x.fp === p.fp; })[0] : null;
        var name = t0 ? firstLine(t0.t) : '할 일';
        if (t0 && t0.rep && p.on) return name + ' — 다음 회차로';
        return name + (p.on ? ' — 끝냄' : ' — 되돌림');
      }
      case 'memo.add': return firstLine(p.t);
      case 'attend.set': return pre + stuNameIn(p.cls, p.key) + ' · ' + md(p.date) + ' · ' + recText(p.rec);
      case 'attend.clear': return pre + stuNameIn(p.cls, p.key) + ' · ' + md(p.date) + ' · 출석으로';
      case 'attend.setMany': return pre + arr(p.keys).length + '명 출결 · ' + md(p.date) + ' · ' + recText(p.rec);
      case 'attend.clearMany': return pre + arr(p.keys).length + '명 출석으로 · ' + md(p.date);
      case 'snote.add': return pre + (p.name || '') + ' · ' + firstLine(p.t);
    }
    return '';
  }

  function renderPbar(ready) {
    var bar = $('pbar');
    var ops = pend();
    var act = ops.filter(isActive);
    var rej = rejectedList();
    var ok = ops.filter(function (o) { return o.status === 'applied'; });
    var show = ready && (act.length > 0 || rej.length > 0 || ok.length > 0);
    bar.hidden = !show;
    document.body.classList.toggle('has-pbar', !!show);
    if (!show) { ui.pbarOpen = false; return; }

    var b = $('pbar-btn');
    clear(b);
    b.className = 'pbar-btn' + (rej.length ? ' rej' : (!act.length ? ' ok' : ''));
    var n = h('span', 'pn');
    var tx = h('span', 'px');
    if (rej.length) {
      n.textContent = rej.length;
      tx.textContent = '반영하지 못한 입력 ' + rej.length + '건' + (act.length ? ' · PC 반영 대기 ' + act.length + '건' : '') + ' — 눌러서 확인';
    } else if (act.length) {
      n.textContent = act.length;
      tx.textContent = 'PC 반영 대기 ' + act.length + '건 · PC가 켜져 있으면 1~5분 안에 반영됩니다';
    } else {
      n.textContent = ok.length;
      tx.textContent = 'PC에 반영됨 ' + ok.length + '건';
    }
    b.appendChild(n);
    b.appendChild(tx);
    b.appendChild(icon(ui.pbarOpen ? 'down' : 'up'));
    b.setAttribute('aria-expanded', ui.pbarOpen ? 'true' : 'false');

    var list = $('pbar-list');
    list.hidden = !ui.pbarOpen;
    clear(list);
    if (!ui.pbarOpen) return;
    var items = rej.concat(ops.filter(function (o) { return o.status !== 'rejected'; }).slice().reverse());
    items.forEach(function (o) {
      var row = h('div', 'pi');
      var l = h('div', 'pl');
      l.appendChild(h('span', 'pt', TYPE_KO[o.type] || o.type));
      l.appendChild(h('span', 'pd', opText(o)));
      if (o.status === 'rejected') l.appendChild(h('span', 'why', o.why || '반영하지 못했습니다'));
      row.appendChild(l);
      var ps = h('span', 'ps');
      var mk = markEl(o.status === 'applied' ? 'ok' : (o.status === 'rejected' ? 'rej' : 'wait'));
      if (o.status === 'queued') mk.textContent = '올리기 대기';
      ps.appendChild(mk);
      row.appendChild(ps);
      if (o.status === 'rejected') {
        var dis = btn('dis', '확인', function () {
          ui.dismissed[o.id] = true;
          delete ui.rej[o.id];
          schedule();
        });
        dis.setAttribute('aria-label', '반영 못 한 입력 확인하고 지우기');
        row.appendChild(dis);
      }
      list.appendChild(row);
    });
  }

  // ── 작은 동작 ───────────────────────────
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(function () { t.hidden = true; }, 2500);
  }
  function formErr(id, msg) {
    var e = $(id);
    e.textContent = msg || '';
    e.hidden = !msg;
  }
  function lock(b) {
    b.disabled = true;
    setTimeout(function () { b.disabled = false; }, 700);
  }

  // ── 당겨서 새로 받기(맨 위에서 아래로 72px) ──
  var PTR_GO = 72;
  var ptr = { on: false, y0: 0, x0: 0, dy: 0 };
  function scrollTop() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  function ptrReset() {
    ptr.on = false;
    ptr.dy = 0;
    var el = $('ptr');
    el.style.height = '0px';
    el.hidden = true;
    el.classList.remove('go');
  }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1 || ui.overlay || !isReady() || S().busy) return;
    if (scrollTop() > 0) return;
    var tg = e.target;
    if (tg && tg.closest && tg.closest('.tabs, .pbar, .actbar, .hd, input, textarea')) return;
    ptr.on = true;
    ptr.y0 = e.touches[0].clientY;
    ptr.x0 = e.touches[0].clientX;
    ptr.dy = 0;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!ptr.on) return;
    var dy = e.touches[0].clientY - ptr.y0;
    var dx = Math.abs(e.touches[0].clientX - ptr.x0);
    if (scrollTop() > 0 || dy < 0 || dx > 40) { ptrReset(); return; }
    ptr.dy = dy;
    var el = $('ptr');
    el.hidden = false;
    el.style.height = Math.min(52, Math.round(dy * 0.5)) + 'px';
    var go = dy >= PTR_GO;
    el.classList.toggle('go', go);
    $('ptr-tx').textContent = go ? '놓으면 PC 자료를 새로 받습니다' : '당겨서 새로 받기';
  }, { passive: true });
  document.addEventListener('touchend', function () {
    if (!ptr.on) return;
    var go = ptr.dy >= PTR_GO;
    ptrReset();
    if (go) M.refresh();
  }, { passive: true });
  document.addEventListener('touchcancel', ptrReset, { passive: true });

  // ── 키보드가 올라오면 아래 탭·대기 띠를 숨겨 입력칸을 가리지 않게 ──
  function isField(el) {
    if (!el || !el.tagName) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    var t = String(el.type || 'text').toLowerCase();
    return t === 'text' || t === 'search' || t === 'date' || t === 'email' || t === 'number';
  }
  /* 🔴 «초점이 있으면 숨김»만 보면 안 된다 — 안드로이드는 뒤로 가기로 키보드만 내려도 입력칸 초점이 남아
     아래 탭이 영영 숨은 채가 된다(할 일 추가 뒤 초점을 남겨 두므로 바로 걸린다). 그래서 **화면이 실제로 줄었을 때**
     (visualViewport 높이가 창보다 120px 넘게 작음 = 키보드가 떠 있음)만 숨긴다. visualViewport가 없는 옛 브라우저만 초점으로 본다 */
  var kbBase = window.innerHeight;
  function kbPaint() {
    var vv = window.visualViewport;
    var focused = isField(document.activeElement) && !ui.overlay;
    if (vv && !focused) kbBase = Math.max(kbBase, window.innerHeight);   // 키보드 없을 때의 높이를 기억(주소창 접힘 포함)
    var open = focused && (vv ? (Math.max(kbBase, window.innerHeight) - vv.height > 120) : true);
    document.body.classList.toggle('kb', open);
  }
  document.addEventListener('focusin', function () { setTimeout(kbPaint, 60); setTimeout(kbPaint, 400); });
  document.addEventListener('focusout', function () { setTimeout(kbPaint, 80); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', kbPaint);
  window.addEventListener('orientationchange', function () { kbBase = 0; setTimeout(function () { kbBase = window.innerHeight; kbPaint(); }, 400); });

  // ── 고정 요소 연결 ───────────────────────
  $('btn-refresh').appendChild(icon('refresh'));
  $('btn-opt').appendChild(icon('sliders'));
  $('sh-close').appendChild(icon('close'));
  $('opt-close').appendChild(icon('close'));

  $('btn-refresh').addEventListener('click', function () { M.refresh(); });
  $('btn-opt').addEventListener('click', openOptions);
  $('opt-close').addEventListener('click', function () { closeOverlay(); });
  $('btn-band-retry').addEventListener('click', function () { M.refresh(); });
  $('btn-external').addEventListener('click', function () { M.openExternal(); });
  $('btn-login').addEventListener('click', function () {
    var b = this;
    b.disabled = true;
    setTimeout(function () { b.disabled = false; }, 5000);
    M.login();
  });
  $('btn-err-act').addEventListener('click', function () {
    if (errFn === 'login') M.login();
    else if (errFn === 'reload') window.location.reload();
    else if (errFn === 'external') M.openExternal();
    else M.refresh();
  });
  $('btn-logout-err').addEventListener('click', function () { M.logout(); });

  TABS.forEach(function (t) {
    $('tab-' + t).addEventListener('click', function () { setTab(t); });
  });
  $('tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var vis = TABS.filter(function (t) { return !$('tab-' + t).hidden; });
    var i = vis.indexOf(ui.tab);
    i = (i + (e.key === 'ArrowRight' ? 1 : -1) + vis.length) % vis.length;
    setTab(vis[i]);
    $('tab-' + vis[i]).focus();
    e.preventDefault();
  });

  $('todo-add').addEventListener('pointerdown', function () {
    ui.refocusTodo = document.activeElement === $('todo-t');
  });
  $('todo-add').addEventListener('click', addTodo);
  $('todo-t').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); addTodo(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('#todo-form .chip'), function (b) {
    b.addEventListener('click', function () {
      var d = b.getAttribute('data-due');
      $('todo-due').value = d === '' ? '' : addDays(today(), +d);
      dueChips();
    });
  });
  $('todo-due').addEventListener('change', dueChips);
  $('todo-due').addEventListener('input', dueChips);
  $('memo-add').addEventListener('click', addMemo);

  $('act-clear').addEventListener('click', onActClear);
  $('act-set').addEventListener('click', openSheetMany);

  $('sh-close').addEventListener('click', function () { closeOverlay(); });
  $('sh-save').addEventListener('click', saveAttend);
  $('sh-clear').addEventListener('click', clearAttend);
  $('sh-tadd').addEventListener('click', addTalk);
  $('sh-why').addEventListener('input', function () { if (ui.sheet) ui.sheet.why = this.value; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.overlay) closeOverlay();
  });
  window.addEventListener('popstate', function () {
    if (ui.ignorePop) { ui.ignorePop = false; return; }
    if (ui.overlay) closeOverlay(true);
  });

  $('pbar-btn').addEventListener('click', function () {
    ui.pbarOpen = !ui.pbarOpen;
    renderPbar(isReady());
  });

  // 새로 고침 뒤 남은 덮는 판 기록은 지운다
  try {
    var hs = window.history.state;
    if (hs && (hs.td2ov || hs.td2sheet)) window.history.replaceState(null, '');
  } catch (e) { /* 무시 */ }

  M.on(schedule);
  render();
  M.start();
  setInterval(schedule, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });
})();
