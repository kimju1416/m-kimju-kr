/* ui.js — TD2 폰 화면(그리기·누르기).
   자료는 window.TD2M(core.js)에서만 받는다. 이 파일은 계산하지 않고 그리기만 한다
   (지금 몇 교시인지만 폰 시계로 잰다).
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
    down: 'm6 9 6 6 6-6'
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
  function table(widths) {
    var t = h('table', 't');
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
  function diff(a, b) { return dayNum(b) - dayNum(a); }        // b - a (일)
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
  function toMin(hm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hm || '');
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
  function dayOf(s) { var v = V(); return (v && v.days && v.days[s]) || null; }
  function rangeFrom() { var v = V(); return (v && v.range && isYmd(v.range.from)) ? v.range.from : addDays(today(), -60); }
  function rangeTo() { var v = V(); return (v && v.range && isYmd(v.range.to)) ? v.range.to : addDays(today(), 90); }
  function clampDay(s, a, b) { return s < a ? a : (s > b ? b : s); }
  function hasStudents() {
    var v = V();
    return !!(v && v.students === true && v.attend && Array.isArray(v.attend.students));
  }
  function pend() { return arr(S().pending); }
  function isActive(o) { return o && (o.status === 'queued' || o.status === 'sent'); }

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
  var LS_TAB = 'td2m.tab';
  var TABS = ['cal', 'today', 'memo', 'stu'];
  var ui = {
    tab: 'cal',
    dayRef: today(),
    calYm: '', calSel: '',
    tdDay: '', stuDay: '',
    pbarOpen: false,
    rej: {}, dismissed: {},
    sheet: null, sheetPushed: false, ignorePop: false,
    toastTimer: 0, queued: false
  };
  try {
    var savedTab = window.localStorage.getItem(LS_TAB);
    if (TABS.indexOf(savedTab) >= 0) ui.tab = savedTab;
  } catch (e) { /* 저장소 막힘: 기본 탭 */ }

  // ── 폰에서 적은 것을 화면에 먼저 보이기(낙관적 표시) ─────
  // mark: 'wait'(PC 반영 대기) · 'next'(다음 회차로 넘김 대기) · 'ok'(반영됨) · 'rej'(반영 못 함)
  var MARK = { wait: 'PC 반영 대기', next: '다음 회차로 넘김 대기', ok: '반영됨', rej: '반영 못 함', short: '대기' };
  function markEl(mark, short) {
    var cls = 'mk' + (mark === 'ok' ? ' ok' : '') + (mark === 'rej' ? ' rej' : '');
    return h('span', cls, short && mark === 'wait' ? MARK.short : MARK[mark]);
  }

  function dispTodos() {
    var v = V();
    if (!v) return [];
    var list = arr(v.todos).map(function (t) {
      return {
        fp: t.fp, t: String(t.t || ''), done: !!t.done, srcDone: !!t.done, doneAt: t.doneAt || '',
        due: t.due || '', start: t.start || '', rep: t.rep || '', repLabel: t.repLabel || '',
        cat: t.cat || null, mark: '', isNew: false
      };
    });
    var byFp = {};
    list.forEach(function (x) { if (x.fp && !byFp[x.fp]) byFp[x.fp] = x; });
    var added = [];
    pend().forEach(function (o) {
      var p = o.p || {};
      var i, x;
      if (o.type === 'todo.add') {
        if (isActive(o)) {
          added.unshift({ fp: '', t: String(p.t || ''), done: false, srcDone: false, doneAt: '', due: p.due || '', start: '', rep: '', repLabel: '', cat: null, mark: 'wait', isNew: true });
        } else if (o.status === 'applied') {
          for (i = 0; i < list.length; i++) {
            if (list[i].t === p.t && !list[i].mark) { list[i].mark = 'ok'; break; }
          }
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
      return { t: String(m.t || ''), c: m.c || '', card: String(m.card || '메모'), mark: '' };
    });
    var first = list[0] || { c: '', card: '메모' };
    var added = [];
    pend().forEach(function (o) {
      if (o.type !== 'memo.add') return;
      var p = o.p || {};
      if (isActive(o)) {
        added.unshift({ t: String(p.t || ''), c: first.c, card: first.card, mark: 'wait' });
      } else if (o.status === 'applied') {
        for (var i = 0; i < list.length; i++) {
          if (list[i].t === p.t && !list[i].mark) { list[i].mark = 'ok'; break; }
        }
      }
    });
    return added.concat(list);
  }

  function attRec(date, key) {
    var v = V();
    var days = (v && v.attend && v.attend.days) || {};
    var rec = (days[date] && days[date][key]) || null;
    var mark = '';
    pend().forEach(function (o) {
      if (o.type !== 'attend.set' && o.type !== 'attend.clear') return;
      var p = o.p || {};
      if (p.date !== date || p.key !== key) return;
      if (isActive(o)) {
        rec = o.type === 'attend.set' ? (p.rec || null) : null;
        mark = 'wait';
      } else if (o.status === 'applied') {
        if (mark !== 'wait') mark = 'ok';
      } else if (o.status === 'rejected' && !ui.dismissed[o.id]) {
        if (mark !== 'wait') mark = 'rej';
      }
    });
    return { rec: rec, mark: mark };
  }

  function talkList(key, name) {
    var v = V();
    var base = arr(v && v.talk && v.talk[key]).map(function (x) {
      return { d: x.d || '', t: String(x.t || ''), mark: '' };
    });
    var added = [];
    pend().forEach(function (o) {
      if (o.type !== 'snote.add') return;
      var p = o.p || {};
      if (p.name !== name) return;
      if (isActive(o)) {
        added.unshift({ d: p.d || '', t: String(p.t || ''), mark: 'wait' });
      } else if (o.status === 'applied') {
        for (var i = 0; i < base.length; i++) {
          if (base[i].t === p.t && base[i].d === p.d && !base[i].mark) { base[i].mark = 'ok'; break; }
        }
      }
    });
    var all = added.concat(base);
    // 최근 날짜 먼저 (같은 날은 폰에서 적은 것 먼저 — 안정 정렬)
    return all.map(function (x, i) { return { x: x, i: i }; })
      .sort(function (a, b) { return a.x.d < b.x.d ? 1 : (a.x.d > b.x.d ? -1 : a.i - b.i); })
      .map(function (w) { return w.x; });
  }

  function slotShort(id) {
    var at = (V() && V().attend) || {};
    var sl = arr(at.slots).filter(function (x) { return x.id === id; })[0];
    return String(sl ? (sl.nm || id) : id).replace(/교시$/, '');
  }
  function recText(rec) {
    if (!rec) return '출석';
    var at = (V() && V().attend) || {};
    var slots = arr(at.slots);
    var ps = arr(rec.p);
    var s = (slots.length && ps.length === slots.length) ? '전체' : ps.map(slotShort).join('·');
    return [rec.g, rec.k].filter(Boolean).join(' ') + (s ? ' · ' + s : '');
  }
  function stuByKey(key) {
    var at = (V() && V().attend) || {};
    return arr(at.students).filter(function (s) { return s.key === key; })[0] || null;
  }
  function stuName(key) {
    var st = stuByKey(key);
    return st ? st.name : String(key || '').split('|').pop();
  }

  // ── 그리기 예약 ─────────────────────────
  function schedule() {
    if (ui.queued) return;
    ui.queued = true;
    var run = function () { ui.queued = false; render(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  // 자정이 지나면 «오늘»에 맞춰 둔 선택을 새 오늘로
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

  // 거절된 입력은 사용자가 [확인]할 때까지 화면에 붙잡아 둔다(메모리에만)
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
    }
    renderPbar(ready);
    if (ui.sheet) {
      if (ready) renderSheetLive();
      else closeSheet();
    }
  }

  function renderHeader(s, ready) {
    var v = s.view;
    var sc = $('hd-school'), sy = $('hd-sync'), rb = $('btn-refresh');
    clear(sy);
    if (ready) {
      var school = v.school || {};
      sc.textContent = [school.name, school.homeroom].filter(Boolean).join(' · ');
      var at = Date.parse(v.at);
      if (!isNaN(at)) {
        var d = new Date(at);
        var age = Date.now() - at;
        var when = (ymd(d) === today() ? '' : md(ymd(d)) + ' ') + hm(d);
        sy.appendChild(h('span', age > 86400000 ? 'old' : '', 'PC ' + when + ' · ' + ago(age)));
      }
      rb.hidden = false;
    } else {
      sc.textContent = '';
      rb.hidden = true;
    }
    rb.disabled = !!s.busy;
    rb.classList.toggle('busy', !!s.busy);
    rb.setAttribute('aria-busy', s.busy ? 'true' : 'false');
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
    'no-drive': {
      title: '구글 드라이브 허락이 빠졌습니다',
      desc: '로그인할 때 허락 화면의 ‘구글 드라이브’ 칸을 켜야 PC 자료를 읽을 수 있습니다.',
      act: '다시 로그인', fn: 'login'
    },
    'newer': {
      title: '페이지를 새로 고쳐 주세요',
      desc: 'PC 앱이 이 페이지보다 새 형식으로 자료를 올렸습니다.',
      act: '새로 고침', fn: 'reload'
    },
    'net': { title: '연결하지 못했습니다', desc: '', act: '다시 시도', fn: 'refresh' },
    'auth': { title: '다시 로그인해 주세요', desc: '', act: '다시 로그인', fn: 'login' },
    'inapp': {
      title: '이 브라우저에서는 로그인할 수 없습니다',
      desc: '카카오톡·네이버 안에서 연 페이지는 구글 로그인이 막힙니다. 기본 브라우저로 열어 주세요.',
      act: '기본 브라우저로 열기', fn: 'external'
    },
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
  function setTab(t) {
    if (ui.tab !== t) {
      ui.tab = t;
      try { window.localStorage.setItem(LS_TAB, t); } catch (e) { /* 무시 */ }
      render();
    }
    window.scrollTo(0, 0);
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
    var b = btn(cls, null, function () {
      ui.calSel = ds;
      renderCal();
    });
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
      if (!ta !== !tb) return ta ? 1 : -1;       // 종일 먼저
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
    var v = V();
    var list = arr(v.ddays).filter(function (x) { return x && isYmd(x.date); });
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

  function renderTodos(t, list) {
    var box = $('cal-todo');
    clear(box);
    var open = list.filter(function (x) { return !x.srcDone; });
    var done = list.filter(function (x) { return x.srcDone; });
    var left = list.filter(function (x) { return !x.done; }).length;
    box.appendChild(sec('할 일', '남은 ' + left + ' / 전체 ' + list.length));
    if (!list.length) { box.appendChild(empty('할 일이 없습니다')); return; }
    open.concat(done).forEach(function (x) { box.appendChild(todoRow(x, t)); });
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

  function addTodo() {
    var b = $('todo-add');
    if (b.disabled) return;
    var t = $('todo-t').value.replace(/\s+/g, ' ').trim();
    var due = $('todo-due').value;
    if (!t) { formErr('todo-err', '할 일 내용을 적어 주세요'); $('todo-t').focus(); return; }
    if (t.length > 200) { formErr('todo-err', '할 일은 200자까지 적을 수 있습니다'); return; }
    var p = { t: t };
    if (isYmd(due)) p.due = due;
    lock(b);
    M.op('todo.add', p);
    $('todo-t').value = '';
    $('todo-due').value = '';
    formErr('todo-err', '');
    toast('할 일을 적었습니다 · PC 반영 대기');
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

  // 지금 몇 교시인지(폰 시계)
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
      var st = '';
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
    formErr('memo-err', '');
    toast('메모를 적었습니다 · PC 반영 대기');
  }

  // ── 4) 학생 ─────────────────────────────
  function stuBounds(t) {
    var a = addDays(t, -45), b = addDays(t, 7);
    var f = rangeFrom(), to = rangeTo();
    return [a < f ? f : a, b > to ? to : b];
  }

  function renderStu() {
    if (!hasStudents()) return;
    var t = today();
    var at = V().attend;
    var bd = stuBounds(t);
    if (!ui.stuDay) ui.stuDay = t;
    ui.stuDay = clampDay(ui.stuDay, bd[0], bd[1]);
    var ds = ui.stuDay;
    dayBar($('stu-bar'), ds, t, bd[0], bd[1], function (d) { ui.stuDay = d; renderStu(); });

    var box = $('stu-list');
    clear(box);
    var studs = arr(at.students).slice().sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
    var counts = {}, order = [];
    var rows = studs.map(function (st) {
      var a = attRec(ds, st.key);
      if (a.rec && a.rec.k) {
        if (!counts[a.rec.k]) { counts[a.rec.k] = 0; order.push(a.rec.k); }
        counts[a.rec.k]++;
      }
      return { st: st, a: a };
    });
    var summary = order.length ? order.map(function (k) { return k + ' ' + counts[k]; }).join(' · ') : '모두 출석';
    box.appendChild(sec((at.cls ? at.cls + ' ' : '') + '출결', summary, order.length > 0));
    if (!studs.length) { box.appendChild(empty('명렬이 없습니다')); return; }
    var hd = h('div', 'ros-h');
    hd.setAttribute('aria-hidden', 'true');
    hd.appendChild(h('span', 'no', '번호'));
    hd.appendChild(h('span', '', '이름'));
    hd.appendChild(h('span', 'sm', '출결'));
    box.appendChild(hd);
    rows.forEach(function (r) {
      var st = r.st, a = r.a;
      var b = btn('ros', null, function () { openSheet(st.key, ds); });
      b.appendChild(h('span', 'no', st.no));
      b.appendChild(h('span', 'nm', st.name));
      var sm = h('span', 'sm' + (a.rec ? '' : ' gray'), recText(a.rec));
      if (a.mark) sm.appendChild(markEl(a.mark, true));
      b.appendChild(sm);
      b.appendChild(icon('right'));
      b.setAttribute('aria-label', st.no + '번 ' + st.name + ', ' + recText(a.rec) + (a.mark ? ', ' + MARK[a.mark] : ''));
      box.appendChild(b);
    });
  }

  // ── 학생 시트 ───────────────────────────
  function openSheet(key, date) {
    var st = stuByKey(key);
    if (!st) return;
    var a = attRec(date, key);
    ui.sheet = {
      key: key, name: st.name, date: date,
      g: a.rec ? (a.rec.g || '') : '',
      k: a.rec ? (a.rec.k || '') : '',
      p: a.rec ? arr(a.rec.p).slice() : [],
      why: a.rec ? String(a.rec.why || '') : ''
    };
    $('sh-why').value = ui.sheet.why;
    $('sh-td').value = date;
    $('sh-tt').value = '';
    formErr('sh-err', '');
    formErr('sh-terr', '');
    var sheet = $('sheet');
    sheet.hidden = false;
    sheet.scrollTop = 0;
    document.body.classList.add('sheet-open');
    try {
      window.history.pushState({ td2sheet: 1 }, '');
      ui.sheetPushed = true;
    } catch (e) { ui.sheetPushed = false; }
    renderSheetEditor();
    renderSheetLive();
    $('sh-close').focus();
  }

  function closeSheet(fromPop) {
    if (!ui.sheet) return;
    ui.sheet = null;
    $('sheet').hidden = true;
    document.body.classList.remove('sheet-open');
    if (!fromPop && ui.sheetPushed) {
      ui.sheetPushed = false;
      ui.ignorePop = true;
      try { window.history.back(); } catch (e) { ui.ignorePop = false; }
    } else {
      ui.sheetPushed = false;
    }
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
    if (!sh || !hasStudents()) return;
    var at = V().attend;
    var slots = arr(at.slots);
    segButtons($('sh-g'), arr(at.gubun), sh.g, function (val) {
      sh.g = val;
      formErr('sh-err', '');
      renderSheetEditor();
    });
    segButtons($('sh-k'), arr(at.jong), sh.k, function (val) {
      if (sh.k !== val) {
        sh.k = val;
        sh.p = defaultSlots(val, slots);
      }
      formErr('sh-err', '');
      renderSheetEditor();
    });
    var pb = $('sh-p');
    clear(pb);
    slots.forEach(function (sl) {
      var on = sh.p.indexOf(sl.id) >= 0;
      var b = btn('', sl.nm || sl.id, function () {
        var i = sh.p.indexOf(sl.id);
        if (i >= 0) sh.p.splice(i, 1); else sh.p.push(sl.id);
        formErr('sh-err', '');
        renderSheetEditor();
      });
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      pb.appendChild(b);
    });
  }

  function renderSheetLive() {
    var sh = ui.sheet;
    if (!sh) return;
    if (!hasStudents()) { closeSheet(); return; }
    var st = stuByKey(sh.key);
    if (!st) { closeSheet(); return; }
    var at = V().attend;
    $('sh-title').textContent = (at.cls ? at.cls + ' · ' : '') + st.no + ' ' + st.name + ' · ' + dayLabel(sh.date);
    var a = attRec(sh.date, sh.key);
    var now = $('sh-now');
    clear(now);
    now.appendChild(h('span', '', '지금 ' + recText(a.rec)));
    if (a.mark) now.appendChild(markEl(a.mark));
    $('sh-clear').disabled = !a.rec;

    var list = talkList(sh.key, st.name);
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
    if (!sh || !hasStudents()) return;
    var b = $('sh-save');
    if (b.disabled) return;
    var at = V().attend;
    sh.why = $('sh-why').value.replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!sh.g) { formErr('sh-err', '구분을 고르세요'); return; }
    if (!sh.k) { formErr('sh-err', '종류를 고르세요'); return; }
    if (!sh.p.length) { formErr('sh-err', '교시를 하나 이상 고르세요'); return; }
    var order = arr(at.slots).map(function (s) { return s.id; });
    var rec = { g: sh.g, k: sh.k, why: sh.why, p: order.filter(function (id) { return sh.p.indexOf(id) >= 0; }) };
    var cur = attRec(sh.date, sh.key).rec;
    if (sameRec(cur, rec)) { toast('바뀐 것이 없습니다'); return; }
    lock(b);
    M.op('attend.set', { cls: at.cls, date: sh.date, key: sh.key, rec: rec });
    toast(sh.name + ' 출결을 적었습니다 · PC 반영 대기');
    closeSheet();
  }

  function clearAttend() {
    var sh = ui.sheet;
    if (!sh || !hasStudents()) return;
    var b = $('sh-clear');
    if (b.disabled) return;
    if (!attRec(sh.date, sh.key).rec) return;
    lock(b);
    M.op('attend.clear', { cls: V().attend.cls, date: sh.date, key: sh.key });
    toast(sh.name + ' 출석으로 되돌렸습니다 · PC 반영 대기');
    closeSheet();
  }

  function addTalk() {
    var sh = ui.sheet;
    if (!sh || !hasStudents()) return;
    var b = $('sh-tadd');
    if (b.disabled) return;
    var d = $('sh-td').value;
    var t = $('sh-tt').value.replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, '');
    if (!isYmd(d)) { formErr('sh-terr', '상담 날짜를 고르세요'); return; }
    if (!t) { formErr('sh-terr', '상담 내용을 적어 주세요'); $('sh-tt').focus(); return; }
    if (t.length > 1000) { formErr('sh-terr', '상담 내용은 1000자까지 적을 수 있습니다'); return; }
    lock(b);
    M.op('snote.add', { cls: V().attend.cls, name: sh.name, d: d, t: t });
    $('sh-tt').value = '';
    formErr('sh-terr', '');
    toast('상담기록을 적었습니다 · PC 반영 대기');
  }

  // ── PC 반영 대기 띠 ─────────────────────
  var TYPE_KO = {
    'todo.add': '할 일 추가', 'todo.done': '할 일 체크', 'memo.add': '메모',
    'attend.set': '출결', 'attend.clear': '출결 되돌림', 'snote.add': '상담기록'
  };
  var STATUS_KO = { queued: '올리기 대기', sent: 'PC 반영 대기', applied: '반영됨', rejected: '반영 못 함' };
  function firstLine(s) {
    var t = String(s || '').split('\n')[0];
    return t.length > 40 ? t.slice(0, 40) + '…' : t;
  }
  function opText(o) {
    var p = o.p || {};
    switch (o.type) {
      case 'todo.add': return firstLine(p.t) + (isYmd(p.due) ? ' · ' + md(p.due) + ' 마감' : '');
      case 'todo.done': {
        var v = V();
        var td0 = v ? arr(v.todos).filter(function (x) { return x.fp === p.fp; })[0] : null;
        var name = td0 ? firstLine(td0.t) : '할 일';
        if (td0 && td0.rep && p.on) return name + ' — 다음 회차로';
        return name + (p.on ? ' — 끝냄' : ' — 되돌림');
      }
      case 'memo.add': return firstLine(p.t);
      case 'attend.set': return stuName(p.key) + ' · ' + md(p.date) + ' · ' + recText(p.rec);
      case 'attend.clear': return stuName(p.key) + ' · ' + md(p.date) + ' · 출석';
      case 'snote.add': return (p.name || '') + ' · ' + firstLine(p.t);
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
      ps.appendChild(markEl(o.status === 'applied' ? 'ok' : (o.status === 'rejected' ? 'rej' : 'wait')));
      if (o.status === 'queued') ps.firstChild.textContent = STATUS_KO.queued;
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
  // 두 번 눌림 막기
  function lock(b) {
    b.disabled = true;
    setTimeout(function () { b.disabled = false; }, 700);
  }

  // ── 고정 요소 연결 ───────────────────────
  $('btn-refresh').appendChild(icon('refresh'));
  $('sh-close').appendChild(icon('close'));

  $('btn-refresh').addEventListener('click', function () { M.refresh(); });
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

  $('todo-add').addEventListener('click', addTodo);
  $('todo-t').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); addTodo(); }
  });
  $('memo-add').addEventListener('click', addMemo);

  $('sh-close').addEventListener('click', function () { closeSheet(); });
  $('sh-save').addEventListener('click', saveAttend);
  $('sh-clear').addEventListener('click', clearAttend);
  $('sh-tadd').addEventListener('click', addTalk);
  $('sh-why').addEventListener('input', function () { if (ui.sheet) ui.sheet.why = this.value; });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.sheet) closeSheet();
  });
  window.addEventListener('popstate', function () {
    if (ui.ignorePop) { ui.ignorePop = false; return; }
    if (ui.sheet) closeSheet(true);
  });

  $('pbar-btn').addEventListener('click', function () {
    ui.pbarOpen = !ui.pbarOpen;
    renderPbar(S().phase === 'ready' && !!S().view);
  });

  // 새로 고침 뒤 남은 시트 기록은 지운다
  try {
    if (window.history.state && window.history.state.td2sheet) window.history.replaceState(null, '');
  } catch (e) { /* 무시 */ }

  M.on(schedule);
  render();
  M.start();
  // 지금 교시·«N분 전»을 30초마다 다시 계산
  setInterval(schedule, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });
})();
