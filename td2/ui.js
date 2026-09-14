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

  var UI_VER = 'm3 · 2026-09-15';
  var PR = window.TD2PREFS || null;
  function prefs() {
    return PR ? PR.get() : { theme: 'base', accent: 'red', font: 'pretendard', size: 'm', start: 'last', tab: 'cal', calWeekend: true, calWeekNo: false, visits: 0, installNo: true };
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
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
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
    sliders: 'M4 7h9M17 7h3M15 5v4M4 17h3M11 17h9M9 15v4',
    cal: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z',
    plus: 'M12 5v14M5 12h14',
    check: 'M5 12.5l4.5 4.5L19 7',
    repeat: 'M4 11a7 7 0 0 1 12.5-4.3M17 3v4h-4M20 13a7 7 0 0 1-12.5 4.3M7 21v-4h4',
    share: 'M12 3v12M8 7l4-4 4 4M5 11v9h14v-9',
    addsq: 'M5 4h14v16H5zM12 8v8M8 12h8'
  };
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function icon(name, cls, width) {
    var s = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': width || '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
    if (cls) s.setAttribute('class', cls);
    s.appendChild(svgEl('path', { d: ICON[name] }));
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
  function addRow(text, fn) {
    var b = btn('addrow', null, fn);
    b.appendChild(icon('plus'));
    b.appendChild(h('span', '', text));
    return b;
  }

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
  function fmtHM(min) {
    min = Math.max(0, Math.round(min || 0));
    return Math.floor(min / 60) + '시간 ' + (min % 60) + '분';
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
  function isRejected(o) { return o && o.status === 'rejected' && !ui.dismissed[o.id]; }

  // 학생 자료: 반별(test2+) 형식으로 맞춘다. 옛 형식(test1: attend.cls·students·days + view.talk)도 받는다.
  function attendModel() {
    var v = V();
    if (!v || v.students !== true || !v.attend) return null;
    if (ui.amSrc === v && ui.am) return ui.am;
    var a = v.attend;
    var classes = [];
    if (Array.isArray(a.classes)) {
      classes = a.classes.filter(function (c) { return c && c.cls && Array.isArray(c.students); }).map(function (c) {
        return { cls: String(c.cls), hr: !!c.hr || String(c.cls) === a.homeroom, students: c.students, days: c.days || {}, talk: c.talk || {}, act: c.act || {} };
      });
    } else if (Array.isArray(a.students)) {
      classes = [{ cls: String(a.cls || ''), hr: true, students: a.students, days: a.days || {}, talk: v.talk || {}, act: {} }];
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
    calYm: '', calSel: '', calPicked: false, tdDay: '', stuDay: '', stuCls: '',
    addKind: 'todo',
    showDone: false,
    scroll: {},
    pbarOpen: false,
    rej: {}, dismissed: {},
    overlay: null, pushed: false, ignorePop: false,
    sheet: null, noteMode: 'talk',
    sel: null, clearArm: 0, logoutArm: 0,
    refocusTodo: false, lastAddAt: 0,
    opMeta: {},                 // 고침·지움 입력의 옛/새 글자(«반영됨» 줄 찾기·대기 목록 이름용, 메모리에만)
    visitCounted: false,
    am: null, amSrc: null,
    toastTimer: 0, queued: false
  };
  if (TABS.indexOf(ui.tab) < 0) ui.tab = 'cal';
  var todoDP = null, evEndDP = null;

  // ── 폰에서 적은 것을 먼저 보이기(낙관적 표시) ─────
  // mark: 'wait'(PC 반영 대기) · 'next'(다음 회차로 넘김 대기) · 'delw'(지우기 대기) · 'ok'(반영됨) · 'rej'(반영 못 함)
  var MARK = { wait: 'PC 반영 대기', next: '다음 회차로 넘김 대기', delw: '지우기 대기', ok: '반영됨', rej: '반영 못 함', short: '대기' };
  function markEl(mark, short) {
    var cls = 'mk' + (mark === 'ok' ? ' ok' : '') + (mark === 'rej' ? ' rej' : '');
    return h('span', cls, short && mark === 'wait' ? MARK.short : MARK[mark]);
  }

  // 반영된 추가 입력이 들어간 줄: 줄.mid === op.id (mid 칸이 없는 옛 파일·일정만 글자로)
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
        cat: t.cat || null, mark: '', isNew: false, del: false
      };
    });
    var byFp = {};
    list.forEach(function (x) { if (x.fp && !byFp[x.fp]) byFp[x.fp] = x; });
    var added = [];
    pend().forEach(function (o) {
      var p = o.p || {};
      var x = p.fp ? byFp[p.fp] : null;
      var i, meta;
      if (o.type === 'todo.add') {
        if (isActive(o)) {
          added.unshift({ fp: '', t: String(p.t || ''), done: false, srcDone: false, doneAt: '', due: p.due || '', start: '', rep: '', repLabel: '', cat: null, mark: 'wait', isNew: true, del: false });
        } else if (o.status === 'applied') {
          markApplied(list, o, function (r) { return r.t === p.t; });
        }
      } else if (o.type === 'todo.done') {
        if (!x) return;
        if (isActive(o)) {
          if (x.rep) { if (p.on) x.mark = 'next'; }
          else { x.done = !!p.on; x.mark = 'wait'; }
        } else if (o.status === 'applied') {
          if (x.mark !== 'wait' && x.mark !== 'next') x.mark = 'ok';
        } else if (isRejected(o)) {
          if (!x.mark) x.mark = 'rej';
        }
      } else if (o.type === 'todo.edit') {
        if (isActive(o)) {
          if (!x) return;
          if (p.t !== undefined) x.t = String(p.t);
          if (p.due !== undefined) x.due = p.due;
          x.mark = 'wait';
        } else if (o.status === 'applied') {
          meta = ui.opMeta[o.id];
          if (!meta) return;
          for (i = 0; i < list.length; i++) {
            if (!list[i].mark && list[i].t === meta.t && list[i].due === meta.due) { list[i].mark = 'ok'; break; }
          }
        } else if (isRejected(o)) {
          if (x && !x.mark) x.mark = 'rej';
        }
      } else if (o.type === 'todo.del') {
        if (!x) return;
        if (isActive(o)) { x.del = true; x.mark = 'delw'; }
        else if (isRejected(o) && !x.mark) x.mark = 'rej';
      }
    });
    return added.concat(list);
  }

  function dispMemos() {
    var v = V();
    if (!v) return [];
    var list = arr(v.memos).map(function (m) {
      return { fp: m.fp, t: String(m.t || ''), mid: m.mid, c: m.c || '', card: String(m.card || '메모'), mark: '', del: false, isNew: false };
    });
    var byFp = {};
    list.forEach(function (x) { if (x.fp && !byFp[x.fp]) byFp[x.fp] = x; });
    var first = list[0] || { c: '', card: '메모' };
    var added = [];
    pend().forEach(function (o) {
      var p = o.p || {};
      var x = p.fp ? byFp[p.fp] : null;
      var i, meta;
      if (o.type === 'memo.add') {
        if (isActive(o)) added.unshift({ fp: '', t: String(p.t || ''), c: first.c, card: first.card, mark: 'wait', isNew: true });
        else if (o.status === 'applied') markApplied(list, o, function (r) { return r.t === p.t; });
      } else if (o.type === 'memo.edit') {
        if (isActive(o)) { if (x) { x.t = String(p.t || ''); x.mark = 'wait'; } }
        else if (o.status === 'applied') {
          meta = ui.opMeta[o.id];
          var want = meta ? meta.t : p.t;
          for (i = 0; i < list.length; i++) {
            if (!list[i].mark && list[i].t === want) { list[i].mark = 'ok'; break; }
          }
        } else if (isRejected(o) && x && !x.mark) x.mark = 'rej';
      } else if (o.type === 'memo.del') {
        if (!x) return;
        if (isActive(o)) { x.del = true; x.mark = 'delw'; }
        else if (isRejected(o) && !x.mark) x.mark = 'rej';
      }
    });
    return added.concat(list);
  }

  function dispDdays() {
    var v = V();
    var list = arr(v && v.ddays).filter(function (x) { return x && isYmd(x.date); }).map(function (x) {
      return { t: String(x.t || ''), date: x.date, mid: x.mid, mark: '' };
    });
    var added = [];
    pend().forEach(function (o) {
      if (o.type !== 'dday.add') return;
      var p = o.p || {};
      if (isActive(o)) added.push({ t: String(p.t || ''), date: p.date, mark: 'wait' });
      else if (o.status === 'applied') markApplied(list, o, function (r) { return r.t === p.t && r.date === p.date; });
    });
    return list.concat(added.filter(function (x) { return isYmd(x.date); }));
  }

  // 그 날 일정 + 폰에서 적은 일정(event.add)·체크(event.done)
  function dispEvents(ds) {
    var d = dayOf(ds);
    var list = (d ? arr(d.events) : []).filter(Boolean).map(function (e) {
      var c = {};
      for (var k in e) if (Object.prototype.hasOwnProperty.call(e, k)) c[k] = e[k];
      c.mark = '';
      return c;
    });
    pend().forEach(function (o) {
      var p = o.p || {};
      if (o.type === 'event.add') {
        if (!isYmd(p.date)) return;
        var end = isYmd(p.end) ? p.end : p.date;
        if (ds < p.date || ds > end) return;
        if (isActive(o)) {
          list.push({ t: String(p.t || ''), tm: ds === p.date ? (p.tm || '') : '', end: '', src: 'mine', red: 0, done: 0, cont: ds === p.date ? 0 : 1, mark: 'wait', isNew: true });
        } else if (o.status === 'applied') {
          markApplied(list.filter(function (e) { return e.src === 'mine'; }), o, function (e) { return e.t === p.t; });
        }
      } else if (o.type === 'event.done') {
        list.forEach(function (e) {
          if (e.src !== 'mine' || e.sk !== p.sk || e.fp !== p.fp) return;
          if (e.occ && p.occ && e.occ !== p.occ) return;
          if (isActive(o)) { e.done = p.on ? 1 : 0; e.mark = 'wait'; }
          else if (o.status === 'applied') { if (!e.mark) e.mark = 'ok'; }
          else if (isRejected(o)) { if (!e.mark) e.mark = 'rej'; }
        });
      }
    });
    return list;
  }

  // 그 날 진도 + 폰에서 적은 진도(prog.set·prog.clear)
  function dispProg(ds, d) {
    var t = today();
    var list = arr(d && d.prog).filter(Boolean).map(function (x) {
      return { p: x.p, cls: String(x.cls || ''), n: +x.n || 0, txt: String(x.txt || ''), plan: String(x.plan || ''), memo: String(x.memo || ''), state: x.state || 'plan', mark: '' };
    }).sort(function (a, b) { return (a.p || 0) - (b.p || 0); });
    pend().forEach(function (o) {
      if (o.type !== 'prog.set' && o.type !== 'prog.clear') return;
      var p = o.p || {};
      if (p.date !== ds) return;
      list.forEach(function (x) {
        if (x.p !== p.p || x.cls !== p.cls) return;
        if (isActive(o)) {
          if (o.type === 'prog.set') {
            x.state = p.off ? 'off' : 'done';
            if (!p.off) x.n = +p.n || x.n;
            if (p.memo !== undefined) x.memo = String(p.memo);
          } else {
            x.state = ds < t ? 'empty' : 'plan';
            x.memo = '';
          }
          x.mark = 'wait';
        } else if (o.status === 'applied') {
          if (!x.mark) x.mark = 'ok';
        } else if (isRejected(o)) {
          if (!x.mark) x.mark = 'rej';
        }
      });
    });
    return list;
  }

  // 초과근무: 날짜별 분(test3) + 폰에서 적은 것(ot.set)
  function dispOt() {
    var v = V();
    var ot = (v && v.ot) || {};
    var days = {}, memo = {}, marks = {}, gone = {};
    var k;
    for (k in (ot.days || {})) if (Object.prototype.hasOwnProperty.call(ot.days, k)) days[k] = +ot.days[k] || 0;
    for (k in (ot.memo || {})) if (Object.prototype.hasOwnProperty.call(ot.memo, k)) memo[k] = String(ot.memo[k] || '');
    pend().forEach(function (o) {
      if (o.type !== 'ot.set') return;
      var p = o.p || {};
      if (!isYmd(p.date)) return;
      if (isActive(o)) {
        if (p.min > 0) {
          days[p.date] = p.min;
          if (p.why) memo[p.date] = String(p.why); else delete memo[p.date];
          delete gone[p.date];
        } else {
          delete days[p.date];
          delete memo[p.date];
          gone[p.date] = true;
        }
        marks[p.date] = 'wait';
      } else if (o.status === 'applied') {
        if (marks[p.date] !== 'wait') marks[p.date] = 'ok';
      } else if (isRejected(o)) {
        if (marks[p.date] !== 'wait') marks[p.date] = 'rej';
      }
    });
    var mon = today().slice(0, 7);
    var rows = Object.keys(days).filter(function (d) { return d.slice(0, 7) === mon; }).map(function (d) {
      return { d: d, min: days[d], why: memo[d] || '', mark: marks[d] || '', del: false };
    });
    Object.keys(gone).forEach(function (d) { if (d.slice(0, 7) === mon) rows.push({ d: d, min: 0, why: '', mark: 'wait', del: true }); });
    rows.sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    var hasDays = !!ot.days;
    var total = hasDays ? rows.reduce(function (a, r) { return a + (r.min || 0); }, 0) : (ot.month === mon && typeof ot.min === 'number' ? ot.min : 0);
    return { rows: rows, total: total, hasDays: hasDays, days: days, memo: memo };
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
      } else if (isRejected(o)) {
        if (mark !== 'wait') mark = 'rej';
      }
    });
    return { rec: rec, mark: mark };
  }

  // 상담(talk·snote.add) / 활동기록(act·snote.act)
  function noteList(kind, cls, key, name) {
    var c = clsOf(cls);
    var src = c ? (kind === 'act' ? c.act : c.talk) : null;
    var type = kind === 'act' ? 'snote.act' : 'snote.add';
    var base = arr(src && src[key]).map(function (x) {
      return { d: x.d || '', t: String(x.t || ''), mid: x.mid, mark: '' };
    });
    var added = [];
    pend().forEach(function (o) {
      if (o.type !== type) return;
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
    if (ready && !ui.visitCounted && PR) {
      ui.visitCounted = true;
      setPref({ visits: prefs().visits + 1 });
    }

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
    } else if (ui.overlay === 'form') {
      if (!ready) closeOverlay();
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
    renderInstallBand(ready);
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

  // ── 탭 (학생 탭은 늘 보인다 — 꺼져 있으면 켜는 방법을 안내) ──
  function renderTabs() {
    $('tab-stu').hidden = false;
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
    if (ui.tab === t) { window.scrollTo(0, 0); return; }
    ui.scroll[ui.tab] = window.pageYOffset || 0;
    ui.tab = t;
    ui.sel = null;
    ui.clearArm = 0;
    setPref({ tab: t });
    render();
    window.scrollTo(0, ui.scroll[t] || 0);
  }
  function scrollToEl(el) {
    if (!el) return;
    var hd = document.querySelector('.hd');
    var top = el.getBoundingClientRect().top + (window.pageYOffset || 0) - (hd ? hd.offsetHeight : 0);
    window.scrollTo(0, Math.max(0, top));
  }

  // ── 날짜 고르기(칩 + 달력 아이콘) ─────────
  // 달력 아이콘 위에 투명한 날짜칸을 겹친다: 폰은 칸 자체를 누르게 되어 달력이 바로 뜨고,
  // PC 크롬은 누를 때 showPicker()로 연다. «빈 곳을 눌러야 날짜가 나오는» 일이 없다.
  function datePicker(o) {
    var wrap = h('div', 'dp');
    var chips = [];
    var input = document.createElement('input');
    input.type = 'date';
    input.className = 'calin';
    if (o.id) input.id = o.id;
    input.setAttribute('aria-label', o.label || '날짜 고르기');
    var lab = h('span', 'dlabel');
    var cp = h('span', 'calpick');
    function mk(val, text) {
      var b = btn('chip', text, function () {
        set(val === null ? '' : addDays(today(), +val));
        if (o.onChange) o.onChange(get());
      });
      b.setAttribute('data-due', val === null ? '' : val);
      chips.push({ b: b, val: val });
      wrap.appendChild(b);
    }
    if (o.none) mk(null, o.noneLabel || '없음');
    arr(o.chips).forEach(function (c) { mk(c[0], c[1]); });
    cp.appendChild(icon('cal'));
    cp.appendChild(input);
    wrap.appendChild(cp);
    wrap.appendChild(lab);
    input.addEventListener('click', function () {
      if (typeof input.showPicker === 'function') {
        try { input.showPicker(); } catch (e) { /* 폰은 칸을 직접 누른 것이라 그대로 열린다 */ }
      }
    });
    input.addEventListener('change', function () { sync(); if (o.onChange) o.onChange(get()); });
    input.addEventListener('input', sync);
    function get() { return isYmd(input.value) ? input.value : ''; }
    function set(v) { input.value = isYmd(v) ? v : ''; sync(); }
    function sync() {
      var v = get();
      var t = today();
      var chipHit = false;
      chips.forEach(function (c) {
        var target = c.val === null ? '' : addDays(t, +c.val);
        var on = v === target;
        if (on && c.val !== null) chipHit = true;
        c.b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      lab.textContent = v ? dayLabel(v) + (v.slice(0, 4) !== t.slice(0, 4) ? ' · ' + v.slice(0, 4) : '') : (o.emptyText || '');
      lab.className = 'dlabel' + (v ? '' : ' none');
      cp.classList.toggle('on', !!v && !chipHit);
    }
    function showNone(show) { chips.forEach(function (c) { if (c.val === null) c.b.hidden = !show; }); }
    sync();
    return { el: wrap, input: input, get: get, set: set, sync: sync, showNone: showNone };
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
    if (todoDP) todoDP.sync();
    if (evEndDP) evEndDP.sync();
  }

  function renderMonth(t, from, to) {
    var box = $('cal-month');
    clear(box);
    var minYm = ym(from), maxYm = ym(to);
    if (ui.calYm < minYm) ui.calYm = minYm;
    if (ui.calYm > maxYm) ui.calYm = maxYm;
    var cur = ui.calYm;
    var pf = prefs();
    var wkend = pf.calWeekend !== false;
    var wkno = !!pf.calWeekNo;
    var cols = wkend ? 7 : 5;

    var bar = h('div', 'mbar');
    var prev = iconBtn('mbtn l', 'left', '이전 달', function () { ui.calYm = addMonths(ui.calYm, -1); renderCal(); });
    prev.disabled = cur <= minYm;
    var mid = h('div', 'mid');
    mid.appendChild(h('span', 'ym', cur));
    var lg = h('span', 'lg');
    [['k-mine', '내 일정'], ['k-sched', '학사'], ['k-gcal', '구글']].forEach(function (x) {
      var w = h('span', 'lgi');
      w.appendChild(h('i', 'lgb ' + x[0]));
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

    var dow = h('div', 'mdow c' + cols + (wkno ? ' wk' : ''));
    dow.setAttribute('aria-hidden', 'true');
    if (wkno) dow.appendChild(h('span', '', '주'));
    (wkend ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]).forEach(function (i) { dow.appendChild(h('span', i === 0 ? 's' : '', DOW[i])); });
    box.appendChild(dow);

    // 칸 폭이 넉넉하면(96px+) 막대에 시각도 보인다
    var colW = (Math.min(window.innerWidth || 390, 560) - (wkno ? 24 : 0)) / cols;
    var grid = h('div', 'mgrid c' + cols + (wkno ? ' wk' : '') + (colW >= 96 ? ' roomy' : '') + (colW < 60 ? ' tight' : ''));
    var first = cur + '-01';
    var nDays = new Date(+cur.slice(0, 4), +cur.slice(5, 7), 0).getDate();
    var last = cur + '-' + pad(nDays);
    var fd = dowOf(first);
    // 토·일 넣기: 일요일 시작 · 빼기: 월요일 시작(그 주 토·일은 금요일 칸에 «주말 N»)
    var start = wkend ? addDays(first, -fd) : addDays(first, -((fd + 6) % 7));
    var week = 0;
    for (var ws = start; ws <= last; ws = addDays(ws, 7)) {
      week++;
      var cells = [];
      for (var i = 0; i < cols; i++) cells.push(addDays(ws, i));
      var anyIn = cells.some(function (s) { return ym(s) === cur; });
      var wkN = 0, wkDays = [];
      if (!wkend) {
        wkDays = [addDays(ws, 5), addDays(ws, 6)].filter(function (s) { return ym(s) === cur; });
        wkN = wkDays.reduce(function (a, s) { return a + dispEvents(s).length; }, 0);
      }
      if (!anyIn && !wkN) continue;
      if (wkno) grid.appendChild(h('div', 'wn', week + '주'));
      cells.forEach(function (ds, idx) {
        var isLast = idx === cols - 1;
        var inMon = ym(ds) === cur;
        var withWk = !wkend && isLast && wkN > 0;
        if (!inMon && !withWk) {
          grid.appendChild(h('div', 'c off' + (isLast ? ' lastc' : '')));
          return;
        }
        grid.appendChild(monthCell(ds, t, { off: !inMon, last: isLast, wkN: withWk ? wkN : 0 }));
      });
    }
    box.appendChild(grid);
  }

  function sortForBar(evs) {
    return evs.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
      if (!!a.e.red !== !!b.e.red) return a.e.red ? -1 : 1;
      var ta = a.e.tm || '', tb = b.e.tm || '';
      if (!ta !== !tb) return ta ? 1 : -1;
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.i - b.i;
    }).map(function (w) { return w.e; });
  }

  function barEl(e) {
    var k = e.red ? 'red' : (e.src === 'mine' || e.src === 'sched' ? e.src : 'gcal');
    var b = h('span', 'bar k-' + k + (e.done ? ' done' : '') + (e.mark === 'wait' ? ' wait' : ''));
    if (e.src === 'mine' && e.done) b.appendChild(icon('check', 'bi', '3'));
    else if (e.src === 'mine' && e.occ) b.appendChild(icon('repeat', 'bi', '2.6'));
    else b.appendChild(h('span', 'bi'));
    b.appendChild(h('span', 'bt', e.t || '(제목 없음)'));
    if (e.tm && !e.cont) b.appendChild(h('span', 'btm', e.tm));
    return b;
  }

  function monthCell(ds, t, o) {
    var evs = sortForBar(dispEvents(ds));
    var red = evs.some(function (e) { return e.red; });
    var dw = dowOf(ds);
    var cls = 'c' + (dw === 0 ? ' sun' : '') + (dw === 6 ? ' sat' : '') + (red ? ' red' : '') +
      (ds === t ? ' today' : '') + (ds === ui.calSel ? ' sel' : '') + (o.off ? ' off2' : '') + (o.last ? ' lastc' : '');
    var b = btn(cls, null, function (e) {
      var more = !!(e.target && e.target.closest && e.target.closest('.more, .wkn'));
      selectDay(ds, more);
    });
    b.appendChild(h('span', 'dn', +ds.slice(8, 10)));
    var shown = evs.length > 3 ? evs.slice(0, 3) : evs;
    shown.forEach(function (e) { b.appendChild(barEl(e)); });
    if (evs.length > 3) b.appendChild(h('span', 'more', '+' + (evs.length - 3)));
    if (o.wkN) b.appendChild(h('span', 'wkn', '주말 ' + o.wkN));
    var names = evs.slice(0, 3).map(function (e) { return e.t; }).join(', ');
    b.setAttribute('aria-label', (+ds.slice(5, 7)) + '월 ' + (+ds.slice(8, 10)) + '일 ' + DOW[dw] + '요일' +
      (ds === t ? ', 오늘' : '') + (red ? ', 쉬는 날' : '') +
      (evs.length ? ', 일정 ' + evs.length + '건: ' + names : '') + (o.wkN ? ', 주말 일정 ' + o.wkN + '건' : ''));
    b.setAttribute('aria-pressed', ds === ui.calSel ? 'true' : 'false');
    if (ds === t) b.setAttribute('aria-current', 'date');
    return b;
  }

  function selectDay(ds, scroll) {
    ui.calSel = ds;
    ui.calPicked = true;
    if (todoDP) todoDP.set(ds);      // 캘린더에서 고른 날이 적기 줄의 기본 날짜
    renderCal();
    if (scroll) scrollToEl($('cal-day'));
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
    if (e.occ) parts.push('반복');
    if (e.tm && e.end) parts.push(e.tm + '–' + e.end);
    if (e.red) parts.push('쉬는 날');
    if (e.done) parts.push('끝냄');
    return parts.join(' · ');
  }
  function evTitleCell(e) {
    var c = td('');
    c.appendChild(h('span', 'ttl' + (e.red ? ' hot' : ''), e.t || '(제목 없음)'));
    var mini = eventMini(e);
    if (mini || e.mark) {
      var mn = h('span', 'mini', mini);
      if (e.mark) {
        if (mini) mn.appendChild(document.createTextNode(' '));
        mn.appendChild(markEl(e.mark));
      }
      c.appendChild(mn);
    }
    return c;
  }
  // 내 일정은 오른쪽 칸이 체크 단추(반복이면 그 회차), 학사·구글은 구분 글자
  function evKindCell(e) {
    if (e.src !== 'mine') {
      var c0 = td('');
      c0.appendChild(srcChip(e.src));
      return c0;
    }
    var c = td('ckc');
    var b = btn('evck' + (e.done ? ' on' : ''), null, function () { onEventDone(e); });
    b.setAttribute('role', 'checkbox');
    b.setAttribute('aria-checked', e.done ? 'true' : 'false');
    b.setAttribute('aria-label', '내 일정 ' + (e.t || '') + (e.occ ? ' (' + md(e.occ) + ' 회차)' : '') + ' 끝냄');
    b.appendChild(h('span', 'bx'));
    b.appendChild(h('span', 'bl', '내'));
    c.appendChild(b);
    return c;
  }
  function onEventDone(e) {
    if (e.isNew || !e.sk || !e.fp) { toast('PC에 반영된 뒤에 체크할 수 있습니다'); return; }
    var p = { sk: e.sk, fp: e.fp, on: !e.done };
    if (e.occ) p.occ = e.occ;
    M.op('event.done', p);
  }
  function eventTable(evs) {
    var tb = table(['58px', '', '56px']);
    var body = h('tbody');
    evs.forEach(function (e) {
      var tr = h('tr', e.done && e.src === 'mine' ? 'done' : '');
      tr.appendChild(td('tm' + (e.red ? ' hot' : ''), e.cont ? '이어짐' : (e.tm || '종일')));
      tr.appendChild(evTitleCell(e));
      tr.appendChild(evKindCell(e));
      body.appendChild(tr);
    });
    tb.appendChild(body);
    return tb;
  }

  function renderSelDay(t, list) {
    var box = $('cal-day');
    clear(box);
    var ds = ui.calSel;
    var evs = sortEvents(dispEvents(ds));
    box.appendChild(sec(dayLabel(ds) + ' 일정', (ds === t ? '오늘 · ' : '') + evs.length + '건'));
    if (evs.length) box.appendChild(eventTable(evs));
    else box.appendChild(empty('일정이 없습니다'));
    // 토·일을 뺀 달력이면 금요일 목록에 그 주말 일정도
    if (prefs().calWeekend === false && dowOf(ds) === 5) {
      [addDays(ds, 1), addDays(ds, 2)].forEach(function (wd) {
        var we = sortEvents(dispEvents(wd));
        if (!we.length) return;
        box.appendChild(h('div', 'sub-sec', '주말 · ' + dayLabel(wd) + ' ' + we.length + '건'));
        box.appendChild(eventTable(we));
      });
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
      sortEvents(dispEvents(ds).filter(function (e) { return !e.cont; })).forEach(function (e) {
        rows.push({ ds: ds, e: e });
      });
    }
    box.appendChild(sec('다가오는 일정', '내일부터 14일 · ' + rows.length + '건'));
    if (!rows.length) { box.appendChild(empty('다가오는 일정이 없습니다')); return; }
    var tb = table(['56px', '50px', '', '56px']);
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
      tr.appendChild(evTitleCell(e));
      tr.appendChild(evKindCell(e));
      body.appendChild(tr);
    });
    tb.appendChild(body);
    box.appendChild(tb);
    if (rows.length > 8) box.appendChild(h('p', 'foot', '앞의 8건만 보입니다. 날짜를 눌러 나머지를 보세요.'));
  }

  function renderDday(t) {
    var box = $('cal-dday');
    clear(box);
    var list = dispDdays();
    box.appendChild(sec('D-DAY', list.length + '건'));
    if (list.length) {
      var tb = table(['66px', '', '56px']);
      var body = h('tbody');
      list.forEach(function (x) {
        var n = diff(t, x.date);
        var label = n === 0 ? 'D-DAY' : (n > 0 ? 'D-' + n : 'D+' + (-n));
        var tr = h('tr');
        tr.appendChild(td('tm' + (n >= 0 && n <= 7 ? ' hot' : ''), label));
        var c = td('ttl', x.t || '');
        if (x.mark) { c.appendChild(document.createTextNode(' ')); c.appendChild(markEl(x.mark, true)); }
        tr.appendChild(c);
        tr.appendChild(td('tm sub', md(x.date)));
        body.appendChild(tr);
      });
      tb.appendChild(body);
      box.appendChild(tb);
    } else {
      box.appendChild(empty('D-Day가 없습니다'));
    }
    box.appendChild(addRow('D-Day 추가', openDdayAdd));
  }

  function renderTodos(t, list) {
    var box = $('cal-todo');
    clear(box);
    var open = list.filter(function (x) { return !x.srcDone; });
    var done = list.filter(function (x) { return x.srcDone; });
    var left = list.filter(function (x) { return !x.done && !x.del; }).length;
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

  // 할 일 줄: 왼쪽 체크 단추 + 글자 단추(누르면 고치기 시트)
  function todoRow(x, t) {
    var row = h('div', 'trow' + (x.done ? ' on' : '') + (x.del ? ' del' : ''));
    var col = x.cat && catColor(x.cat.c);
    if (col) row.style.borderLeftColor = col;
    var ck = btn('tck', null, function () { onTodo(x); });
    ck.setAttribute('role', 'checkbox');
    ck.setAttribute('aria-checked', x.done ? 'true' : 'false');
    ck.setAttribute('aria-label', (x.t || '할 일') + ' 끝냄');
    ck.appendChild(h('span', 'bx'));
    var lb = btn('tlb', null, function () { openTodoEdit(x); });
    var inner = h('span', 'lb');
    inner.appendChild(h('span', 'lt', x.t || '(내용 없음)'));
    var meta = h('span', 'meta');
    if (x.cat && x.cat.nm) meta.appendChild(h('span', 'cat', x.cat.nm));
    if (x.rep) meta.appendChild(h('span', '', x.repLabel || '반복'));
    if (isYmd(x.start) && x.start > t && !x.done) meta.appendChild(h('span', '', md(x.start) + '부터'));
    if (x.mark) meta.appendChild(markEl(x.mark));
    if (meta.firstChild) inner.appendChild(meta);
    lb.appendChild(inner);
    var due = dueLabel(x, t);
    if (due) lb.appendChild(h('span', 'dt' + (due.cls ? ' ' + due.cls : ''), due.text));
    lb.setAttribute('aria-label', (x.t || '할 일') + (due ? ', ' + due.text : '') + ', 눌러서 고치기');
    row.appendChild(ck);
    row.appendChild(lb);
    return row;
  }

  function onTodo(x) {
    if (x.isNew) { toast('PC에 반영된 뒤에 체크할 수 있습니다'); return; }
    if (!x.fp) return;
    if (x.del) { toast('지우기를 기다리고 있습니다'); return; }
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

  // 적기 줄: [할 일 | 일정]
  function setKind(k) {
    ui.addKind = k === 'event' ? 'event' : 'todo';
    var ev = ui.addKind === 'event';
    qsa('#todo-form .kd').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-kind') === ui.addKind ? 'true' : 'false');
    });
    $('todo-t').placeholder = ev ? '새 일정' : '새 할 일';
    $('todo-t-lb').textContent = ev ? '새 일정' : '새 할 일';
    $('ev-row').hidden = !ev;
    todoDP.showNone(!ev);
    if (ev && !todoDP.get()) todoDP.set(ui.calPicked ? ui.calSel : today());
    formErr('todo-err', '');
  }

  function addItem() {
    var inp = $('todo-t');
    var t = inp.value.replace(/\s+/g, ' ').trim();
    var ev = ui.addKind === 'event';
    if (!t) {
      // 방금 추가한 직후의 두 번 누름은 조용히 넘긴다(단추를 잠그면 Enter로 이어 적기가 막힘)
      if (Date.now() - (ui.lastAddAt || 0) < 1200) return;
      formErr('todo-err', ev ? '일정 내용을 적어 주세요' : '할 일 내용을 적어 주세요');
      inp.focus();
      return;
    }
    if (t.length > 200) { formErr('todo-err', '200자까지 적을 수 있습니다'); return; }
    var keep = ui.refocusTodo || document.activeElement === inp;
    ui.refocusTodo = false;
    if (ev) {
      var date = todoDP.get() || (ui.calPicked ? ui.calSel : today());
      var tm = $('ev-tm').value;
      var end = evEndDP.get();
      if (tm && !/^\d{2}:\d{2}$/.test(tm)) { formErr('todo-err', '시각을 다시 골라 주세요'); return; }
      if (end && end <= date) { formErr('todo-err', '끝나는 날은 시작하는 날 뒤로 골라 주세요'); return; }
      if (end && diff(date, end) > 62) { formErr('todo-err', '기간 일정은 62일 안으로 적을 수 있습니다'); return; }
      var pe = { date: date, t: t };
      if (tm) pe.tm = tm;
      if (end) pe.end = end;
      ui.lastAddAt = Date.now();
      M.op('event.add', pe);
      inp.value = '';
      $('ev-tm').value = '';
      evEndDP.set('');
      ui.calSel = date;
      ui.calYm = ym(date);
      formErr('todo-err', '');
      toast(dayLabel(date) + ' 일정을 적었습니다 · PC 반영 대기');
      renderCal();
    } else {
      var due = todoDP.get();
      var p = { t: t };
      if (due) p.due = due;
      ui.lastAddAt = Date.now();
      M.op('todo.add', p);
      inp.value = '';
      if (!ui.calPicked) todoDP.set('');
      formErr('todo-err', '');
      toast('할 일을 적었습니다 · PC 반영 대기');
    }
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
    renderProg(ds, d);
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

  var PROG_KO = { done: '기록', plan: '예정', off: '휴강', empty: '안 적음' };
  var PROG_CLS = { done: 'mine', plan: 'sched', off: 'off', empty: 'empty' };
  function progStateText(x) {
    if (x.state === 'done') return x.n + '차시 기록';
    if (x.state === 'off') return '휴강';
    if (x.state === 'empty') return '안 적음' + (x.n ? ' (' + x.n + '차시 차례)' : '');
    return (x.n ? x.n + '차시 ' : '') + '예정';
  }
  function renderProg(ds, d) {
    var box = $('td-prog');
    clear(box);
    var list = dispProg(ds, d);
    var empties = list.filter(function (x) { return x.state === 'empty'; }).length;
    box.appendChild(sec('진도', (empties ? '안 적음 ' + empties + ' · ' : '') + list.length + '건', empties > 0));
    if (!list.length) { box.appendChild(empty('이 날 진도가 없습니다')); return; }
    list.forEach(function (x) {
      var st = PROG_KO[x.state] ? x.state : 'plan';
      var b = btn('prow' + (st === 'empty' ? ' empty' : ''), null, function () { openProg(ds, x); });
      b.appendChild(h('span', 'pp', x.p));
      var pb = h('span', 'pb');
      pb.appendChild(h('span', 'pc', x.cls));
      var mini = [];
      if (x.n && st !== 'off') mini.push(x.n + '차시');
      var content = st === 'off' ? x.txt : (x.plan || x.txt);
      if (content) mini.push(content);
      if (x.memo) mini.push('메모 ' + x.memo);
      if (mini.length) pb.appendChild(h('span', 'pm', mini.join(' · ')));
      b.appendChild(pb);
      var right = h('span', 'ps2');
      right.appendChild(h('span', 'src ' + PROG_CLS[st], PROG_KO[st]));
      if (x.mark) right.appendChild(markEl(x.mark, true));
      b.appendChild(right);
      b.setAttribute('aria-label', x.p + '교시 ' + x.cls + ', ' + progStateText(x) + (x.mark ? ', ' + MARK[x.mark] : '') + ', 눌러서 진도 기록');
      box.appendChild(b);
    });
    box.appendChild(h('p', 'foot', '줄을 누르면 진도를 적습니다. «안 적음»은 지난 7일 안에 기록하지 않은 수업입니다.'));
  }

  function renderOt() {
    var box = $('td-ot');
    clear(box);
    var v = V();
    if (!v || !v.ot) return;
    var o = dispOt();
    var mon = today().slice(0, 7);
    box.appendChild(sec('초과근무', mon));
    var row = h('div', 'ot');
    row.appendChild(h('span', '', '이번 달'));
    row.appendChild(h('b', '', fmtHM(o.total)));
    box.appendChild(row);
    o.rows.forEach(function (r) {
      var b = btn('orow' + (r.del ? ' del' : ''), null, function () { openOt(r.d); });
      b.appendChild(h('span', 'od', dayLabel(r.d)));
      b.appendChild(h('span', 'om', r.del ? '지움' : fmtMin(r.min)));
      var w = h('span', 'ow', r.why);
      if (r.mark) w.appendChild(markEl(r.mark, true));
      b.appendChild(w);
      b.setAttribute('aria-label', dayLabel(r.d) + ' 초과근무 ' + (r.del ? '지움' : fmtMin(r.min)) + (r.why ? ', ' + r.why : '') + ', 눌러서 고치기');
      box.appendChild(b);
    });
    if (o.hasDays && !o.rows.length) box.appendChild(empty('이번 달 기록이 없습니다'));
    box.appendChild(addRow('초과근무 적기', function () { openOt(today()); }));
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
        var r = btn('memo' + (m.del ? ' del' : ''), null, function () { openMemoEdit(m); });
        var col = catColor(m.c);
        if (col) r.style.borderLeftColor = col;
        r.appendChild(h('span', 'tx', m.t));
        if (m.mark) {
          var mt = h('span', 'mt');
          mt.appendChild(markEl(m.mark));
          r.appendChild(mt);
        }
        r.setAttribute('aria-label', m.t.split('\n')[0] + (m.mark ? ', ' + MARK[m.mark] : '') + ', 눌러서 고치기');
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
    var v = V();
    var m = attendModel();
    if (!v || v.students !== true || !m || !m.classes.length) {
      ui.sel = null;
      clear($('stu-cls'));
      clear($('stu-bar'));
      var box0 = $('stu-list');
      clear(box0);
      box0.appendChild(sec('학생'));
      var nb = h('div', 'note-box');
      if (!v || v.students !== true) {
        nb.appendChild(h('b', '', '학생 자료가 꺼져 있습니다'));
        nb.appendChild(h('p', '', 'PC 설정 [데이터] → 폰 연동 → [학생 자료도]를 켜 주세요. 켠 뒤 PC가 자료를 올리면 여기에 명렬·출결·상담이 보입니다.'));
      } else {
        nb.appendChild(h('b', '', 'PC에 명렬·담임반이 없습니다'));
        nb.appendChild(h('p', '', 'PC 설정 [학교]에 담임 학년·반을 적거나 명렬에서 학생을 불러와 주세요.'));
      }
      box0.appendChild(nb);
      renderActbar(true);
      return;
    }
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
      return { st: st, a: a, talk: noteList('talk', c.cls, st.key, st.name).length };
    });
    var summary = order.length ? order.map(function (k) { return k + ' ' + counts[k]; }).join(' · ') : '모두 출석';
    box.appendChild(sec(c.cls + ' 출결 · ' + dayLabel(ds), summary, order.length > 0));

    var tool = h('div', 'tool');
    if (!ui.sel) {
      tool.appendChild(h('span', 'tx', '학생을 누르면 출결·상담·활동기록을 적습니다'));
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
    setNoteMode(ui.noteMode, true);
    var el = $('sheet');
    el.hidden = false;
    el.scrollTop = 0;
    openOverlay('sheet');
    renderSheetEditor();
    renderSheetLive();
    $('sh-close').focus();
  }

  // 상담 | 활동기록 갈래
  function setNoteMode(mode, quiet) {
    ui.noteMode = mode === 'act' ? 'act' : 'talk';
    var act = ui.noteMode === 'act';
    qsa('#sh-note-seg [data-note]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-note') === ui.noteMode ? 'true' : 'false');
    });
    $('sh-note-h').textContent = act ? '활동기록' : '상담기록';
    var cau = $('sh-note-caution');
    cau.textContent = act ? '활동기록은 생기부 쓸 때 PC에서 불러옵니다.' : '상담기록은 PC 화면에서만 보던 자료입니다. 폰을 다른 사람에게 보여 줄 때 주의하세요.';
    cau.className = 'caution' + (act ? ' info' : '');
    $('lb-td').textContent = act ? '활동 날짜' : '상담 날짜';
    $('lb-tt').textContent = act ? '활동 내용' : '상담 내용';
    $('sh-tt').placeholder = act ? '예: 학급 회의 사회를 맡아 의견을 정리함' : '상담 내용';
    $('sh-tadd').textContent = act ? '활동기록 추가' : '상담 기록 추가';
    formErr('sh-terr', '');
    if (!quiet && ui.sheet && ui.sheet.mode === 'one') renderSheetLive();
  }

  var OVERLAY_EL = { sheet: 'sheet', opt: 'opt', form: 'fsheet' };
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
    $(OVERLAY_EL[was]).hidden = true;
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
    var act = ui.noteMode === 'act';
    var list = noteList(ui.noteMode, c.cls, st.key, st.name);
    $('sh-talk-n').textContent = list.length + '건';
    var box = $('sh-talk');
    clear(box);
    if (!list.length) { box.appendChild(empty(act ? '활동기록이 없습니다' : '상담기록이 없습니다')); return; }
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
    var act = ui.noteMode === 'act';
    var d = $('sh-td').value;
    var t = $('sh-tt').value.replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, '');
    if (!isYmd(d)) { formErr('sh-terr', (act ? '활동' : '상담') + ' 날짜를 고르세요'); return; }
    if (!t) { formErr('sh-terr', (act ? '활동' : '상담') + ' 내용을 적어 주세요'); $('sh-tt').focus(); return; }
    if (t.length > 1000) { formErr('sh-terr', '1000자까지 적을 수 있습니다'); return; }
    lock(b);
    M.op(act ? 'snote.act' : 'snote.add', { cls: sh.cls, name: sh.name, d: d, t: t });
    $('sh-tt').value = '';
    $('sh-tt').blur();
    formErr('sh-terr', '');
    toast((act ? '활동기록' : '상담기록') + '을 적었습니다 · PC 반영 대기');
  }

  // ── 입력 시트(할 일·메모 고치기, D-Day, 초과근무, 진도) ──
  function fsOpen(title, build) {
    if (ui.overlay) return false;
    $('fs-title').textContent = title;
    var body = $('fs-body');
    clear(body);
    build(body);
    var el = $('fsheet');
    el.hidden = false;
    el.scrollTop = 0;
    openOverlay('form');
    $('fs-close').focus();
    return true;
  }
  function fLabel(text, forId) {
    var l = h('label', 'ed-lb', text);
    if (forId) l.htmlFor = forId;
    return l;
  }
  function fDiv(text) { return h('div', 'ed-lb', text); }
  function fInput(id, type, value, attrs) {
    var i = document.createElement('input');
    i.className = 'inp';
    i.id = id;
    i.type = type;
    i.value = value === undefined || value === null ? '' : String(value);
    for (var k in (attrs || {})) if (Object.prototype.hasOwnProperty.call(attrs, k)) i.setAttribute(k, attrs[k]);
    return i;
  }
  function fArea(id, value, max, ph) {
    var a = document.createElement('textarea');
    a.className = 'inp area';
    a.id = id;
    a.rows = 3;
    a.maxLength = max;
    if (ph) a.placeholder = ph;
    a.value = value || '';
    return a;
  }
  function errP(id) {
    var p = h('p', 'form-err');
    p.id = id;
    p.hidden = true;
    return p;
  }
  // 되돌리기 어려운 단추: 한 번 누르면 확정 글자로 바뀌고, 4초 안에 한 번 더 눌러야 실행
  function armBtn(cls, label, armLabel, fn) {
    var b = btn(cls, label, function () {
      if (b.getAttribute('data-arm') === '1') {
        b.setAttribute('data-arm', '0');
        fn();
        return;
      }
      b.setAttribute('data-arm', '1');
      b.textContent = armLabel;
      b.classList.add('arm');
      setTimeout(function () {
        if (b.getAttribute('data-arm') === '1') {
          b.setAttribute('data-arm', '0');
          b.textContent = label;
          b.classList.remove('arm');
        }
      }, 4000);
    });
    return b;
  }
  function withId(el, id) { el.id = id; return el; }

  function openTodoEdit(x) {
    if (x.isNew || !x.fp) { toast('PC에 반영된 뒤에 고칠 수 있습니다'); return; }
    if (x.del) { toast('지우기를 기다리고 있습니다'); return; }
    fsOpen('할 일 고치기', function (body) {
      var ed = h('div', 'ed');
      ed.appendChild(fLabel('할 일', 'fs-t'));
      var inT = fInput('fs-t', 'text', x.t, { maxlength: '200', autocomplete: 'off' });
      ed.appendChild(inT);
      ed.appendChild(fDiv('마감'));
      var dp = datePicker({ id: 'fs-due', none: !x.rep, noneLabel: '없음', chips: [['0', '오늘'], ['1', '내일']], label: '마감 날짜 고르기' });
      dp.set(x.due);
      ed.appendChild(dp.el);
      if (x.rep) ed.appendChild(h('p', 'fs-note', '반복 할 일(' + (x.repLabel || '반복') + ')은 마감을 비울 수 없습니다.'));
      ed.appendChild(errP('fs-err'));
      ed.appendChild(withId(btn('pbtn in', '저장', function () {
        var t = inT.value.replace(/\s+/g, ' ').trim();
        var due = dp.get();
        if (!t) { formErr('fs-err', '할 일 내용을 적어 주세요'); return; }
        if (x.rep && !due) { formErr('fs-err', '반복 할 일은 마감을 비울 수 없습니다'); return; }
        var p = { fp: x.fp };
        if (t !== x.t) p.t = t;
        if (due !== (x.due || '')) p.due = due;
        if (p.t === undefined && p.due === undefined) { toast('바뀐 것이 없습니다'); return; }
        var o = M.op('todo.edit', p);
        if (o && o.id) ui.opMeta[o.id] = { t: t, due: due, oldT: x.t };
        closeOverlay();
        toast('할 일을 고쳤습니다 · PC 반영 대기');
      }), 'fs-save'));
      ed.appendChild(withId(armBtn('obtn', '지우기', '한 번 더 누르면 지웁니다', function () {
        var o = M.op('todo.del', { fp: x.fp });
        if (o && o.id) ui.opMeta[o.id] = { oldT: x.t };
        closeOverlay();
        toast('할 일을 지웁니다 · PC 반영 대기');
      }), 'fs-del'));
      body.appendChild(ed);
    });
  }

  function openMemoEdit(m) {
    if (m.isNew || !m.fp) { toast('PC에 반영된 뒤에 고칠 수 있습니다'); return; }
    if (m.del) { toast('지우기를 기다리고 있습니다'); return; }
    fsOpen('메모 고치기', function (body) {
      body.appendChild(h('p', 'fs-now', m.card + ' 카드'));
      var ed = h('div', 'ed');
      ed.appendChild(fLabel('메모 내용', 'fs-t'));
      var ta = fArea('fs-t', m.t, 2000, '메모 내용');
      ed.appendChild(ta);
      ed.appendChild(errP('fs-err'));
      ed.appendChild(withId(btn('pbtn in', '저장', function () {
        var t = ta.value.replace(/\r\n?/g, '\n').replace(/^\s+|\s+$/g, '');
        if (!t) { formErr('fs-err', '메모 내용을 적어 주세요 (지우려면 [지우기])'); return; }
        if (t === m.t) { toast('바뀐 것이 없습니다'); return; }
        var o = M.op('memo.edit', { fp: m.fp, t: t });
        if (o && o.id) ui.opMeta[o.id] = { t: t, oldT: m.t };
        closeOverlay();
        toast('메모를 고쳤습니다 · PC 반영 대기');
      }), 'fs-save'));
      ed.appendChild(withId(armBtn('obtn', '지우기', '한 번 더 누르면 지웁니다', function () {
        var o = M.op('memo.del', { fp: m.fp });
        if (o && o.id) ui.opMeta[o.id] = { oldT: m.t };
        closeOverlay();
        toast('메모를 지웁니다 · PC 반영 대기');
      }), 'fs-del'));
      body.appendChild(ed);
    });
  }

  function openDdayAdd() {
    fsOpen('D-Day 추가', function (body) {
      var ed = h('div', 'ed');
      ed.appendChild(fLabel('이름', 'fs-t'));
      var inT = fInput('fs-t', 'text', '', { maxlength: '100', autocomplete: 'off', placeholder: '예: 2학기 지필평가' });
      ed.appendChild(inT);
      ed.appendChild(fDiv('날짜'));
      var dp = datePicker({ id: 'fs-date', label: 'D-Day 날짜 고르기', emptyText: '달력에서 날짜를 고르세요' });
      ed.appendChild(dp.el);
      ed.appendChild(errP('fs-err'));
      ed.appendChild(withId(btn('pbtn in', '추가', function () {
        var t = inT.value.replace(/\s+/g, ' ').trim();
        var d = dp.get();
        if (!t) { formErr('fs-err', '이름을 적어 주세요'); return; }
        if (!d) { formErr('fs-err', '날짜를 골라 주세요'); return; }
        M.op('dday.add', { t: t, date: d });
        closeOverlay();
        toast('D-Day를 적었습니다 · PC 반영 대기');
      }), 'fs-save'));
      body.appendChild(ed);
    });
  }

  function openOt(date0) {
    fsOpen('초과근무', function (body) {
      var cur = { min: 0 };
      var ed = h('div', 'ed');
      ed.appendChild(fDiv('날짜'));
      var dp = datePicker({ id: 'fs-date', chips: [['0', '오늘'], ['-1', '어제']], label: '초과근무 날짜 고르기', onChange: load });
      ed.appendChild(dp.el);
      ed.appendChild(fDiv('시간'));
      var big = h('p', 'otbig');
      var bigB = h('b');
      big.appendChild(bigB);
      ed.appendChild(big);
      var chips = h('div', 'chips');
      chips.appendChild(withId(btn('chip', '+30분', function () { setMin(cur.min + 30); }), 'fs-p30'));
      chips.appendChild(withId(btn('chip', '+1시간', function () { setMin(cur.min + 60); }), 'fs-p60'));
      chips.appendChild(withId(btn('chip', '0부터', function () { setMin(0); }), 'fs-z'));
      ed.appendChild(chips);
      var hmRow = h('div', 'hm');
      var inH = fInput('fs-h', 'number', '', { min: '0', max: '24', inputmode: 'numeric', 'aria-label': '시간' });
      var inM = fInput('fs-m', 'number', '', { min: '0', max: '59', inputmode: 'numeric', 'aria-label': '분' });
      hmRow.appendChild(inH);
      hmRow.appendChild(h('span', '', '시간'));
      hmRow.appendChild(inM);
      hmRow.appendChild(h('span', '', '분'));
      ed.appendChild(hmRow);
      function typed() {
        var hh = Math.max(0, Math.min(24, parseInt(inH.value, 10) || 0));
        var mm = Math.max(0, Math.min(59, parseInt(inM.value, 10) || 0));
        cur.min = hh * 60 + mm;
        bigB.textContent = fmtHM(cur.min);
      }
      inH.addEventListener('input', typed);
      inM.addEventListener('input', typed);
      ed.appendChild(fLabel('사유 (선택)', 'fs-why'));
      var inW = fInput('fs-why', 'text', '', { maxlength: '100', autocomplete: 'off', placeholder: '예: 학부모 상담 준비' });
      ed.appendChild(inW);
      ed.appendChild(errP('fs-err'));
      var save = withId(btn('pbtn in', '저장', function () {
        var d = dp.get();
        if (!d) { formErr('fs-err', '날짜를 골라 주세요'); return; }
        if (d > today()) { formErr('fs-err', '앞으로 올 날은 적을 수 없습니다'); return; }
        typed();
        if (cur.min <= 0) { formErr('fs-err', '시간을 적어 주세요 (지우려면 [0으로 지우기])'); return; }
        if (cur.min > 1440) { formErr('fs-err', '하루 24시간까지 적을 수 있습니다'); return; }
        var p = { date: d, min: cur.min };
        var why = inW.value.replace(/\s+/g, ' ').trim();
        if (why) p.why = why;
        M.op('ot.set', p);
        closeOverlay();
        toast(md(d) + ' 초과근무 ' + fmtMin(cur.min) + ' · PC 반영 대기');
      }), 'fs-save');
      ed.appendChild(save);
      var clr = withId(armBtn('obtn', '0으로 지우기', '한 번 더 누르면 이 날 기록을 지웁니다', function () {
        var d = dp.get();
        if (!d) return;
        M.op('ot.set', { date: d, min: 0 });
        closeOverlay();
        toast(md(d) + ' 초과근무를 지웁니다 · PC 반영 대기');
      }), 'fs-clear');
      ed.appendChild(clr);
      body.appendChild(ed);
      function setMin(v) {
        v = Math.max(0, Math.min(1440, v));
        cur.min = v;
        inH.value = Math.floor(v / 60);
        inM.value = v % 60;
        bigB.textContent = fmtHM(v);
      }
      function load() {
        var o = dispOt();
        var d = dp.get();
        var have = !!(d && o.days[d]);
        setMin(have ? o.days[d] : 0);
        inW.value = d && o.memo[d] ? o.memo[d] : '';
        clr.hidden = !have;
        formErr('fs-err', '');
      }
      dp.set(date0 || today());
      load();
    });
  }

  function openProg(ds, x) {
    var n0 = x.n > 0 ? x.n : 1;
    var st = { off: x.state === 'off', n: n0 };
    var recorded = x.state === 'done' || x.state === 'off';
    fsOpen(x.cls + ' · ' + x.p + '교시 · ' + dayLabel(ds), function (body) {
      body.appendChild(h('p', 'fs-now', '지금 ' + progStateText(x)));
      var ed = h('div', 'ed');
      ed.appendChild(fLabel('차시', 'fs-n'));
      var stp = h('div', 'stepper');
      var minus = withId(btn('', '−', function () { setN(st.n - 1); }), 'fs-n-minus');
      minus.setAttribute('aria-label', '차시 하나 줄이기');
      var inN = fInput('fs-n', 'number', n0, { min: '1', max: '999', inputmode: 'numeric' });
      var plus = withId(btn('', '+', function () { setN(st.n + 1); }), 'fs-n-plus');
      plus.setAttribute('aria-label', '차시 하나 늘리기');
      stp.appendChild(minus);
      stp.appendChild(inN);
      stp.appendChild(plus);
      stp.appendChild(h('span', 'unit', '차시'));
      ed.appendChild(stp);
      var plan = h('p', 'plan');
      ed.appendChild(plan);
      var chg = h('p', 'fs-note hot', '차시를 바꾸면 PC에서 그 차시 내용으로 적힙니다.');
      chg.id = 'fs-n-note';
      ed.appendChild(chg);
      var tog = withId(btn('tog', null, function () { st.off = !st.off; paint(); }), 'fs-off');
      tog.appendChild(h('span', 'bx'));
      tog.appendChild(h('span', '', '휴강 (이 시간 수업 안 함)'));
      ed.appendChild(tog);
      ed.appendChild(fLabel('메모 (선택)', 'fs-memo'));
      var memoA = fArea('fs-memo', x.memo, 300, '예: 활동지 배부, 3모둠까지 발표');
      ed.appendChild(memoA);
      ed.appendChild(errP('fs-err'));
      var save = withId(btn('pbtn in', '', function () {
        var n = parseInt(inN.value, 10);
        if (!st.off && !(n >= 1 && n <= 999)) { formErr('fs-err', '차시는 1~999로 적어 주세요'); return; }
        var memo = memoA.value.replace(/\r\n?/g, '\n').trim();
        var p = { date: ds, p: x.p, cls: x.cls, n: st.off ? n0 : n };
        if (memo || x.memo) p.memo = memo;
        if (st.off) p.off = true;
        M.op('prog.set', p);
        closeOverlay();
        toast(x.cls + ' ' + x.p + '교시 진도를 적었습니다 · PC 반영 대기');
      }), 'fs-save');
      ed.appendChild(save);
      if (recorded) {
        ed.appendChild(withId(armBtn('obtn', '기록 지우기', '한 번 더 누르면 기록을 지웁니다', function () {
          M.op('prog.clear', { date: ds, p: x.p, cls: x.cls });
          closeOverlay();
          toast(x.cls + ' ' + x.p + '교시 진도 기록을 지웁니다 · PC 반영 대기');
        }), 'fs-clear'));
      }
      body.appendChild(ed);
      function setN(v) {
        v = Math.max(1, Math.min(999, v | 0));
        st.n = v;
        inN.value = v;
        paint();
      }
      inN.addEventListener('input', function () {
        var v = parseInt(inN.value, 10);
        if (v >= 1 && v <= 999) st.n = v;
        paint();
      });
      function paint() {
        tog.setAttribute('aria-pressed', st.off ? 'true' : 'false');
        minus.disabled = st.off;
        plus.disabled = st.off;
        inN.disabled = st.off;
        if (st.off) plan.textContent = '휴강으로 적습니다. 차시는 넘어가지 않습니다.';
        else if (st.n === n0) plan.textContent = n0 + '차시 내용: ' + (x.plan || x.txt || 'PC 진도표에 적힌 내용');
        else plan.textContent = st.n + '차시 — 내용은 PC 진도표에서 가져옵니다';
        chg.hidden = st.off || st.n === n0;
        save.textContent = st.off ? '휴강으로 기록' : st.n + '차시로 기록';
      }
      paint();
    });
  }

  // ── 설정 ────────────────────────────────
  function openOptions(focus) {
    if (!PR || ui.overlay) return;
    PR.loadAllFonts();
    ui.logoutArm = 0;
    renderOptPrefs();
    renderOptInstall();
    renderOptAcct();
    var el = $('opt');
    el.hidden = false;
    el.scrollTop = 0;
    openOverlay('opt');
    $('opt-close').focus();
    if (focus === 'install') {
      var t = $('opt-install');
      el.scrollTop = Math.max(0, t.offsetTop - 56);
    }
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
  function textBtn(b, it) { b.textContent = it.nm; }

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
    box.appendChild(radioGroup('segr', '글자 크기', PR.SIZES, p.size, function (id) { pickPref({ size: id }); }, textBtn));

    box.appendChild(sec('첫 화면', nameOf(PR.STARTS, p.start)));
    var starts = radioGroup('segr', '첫 화면', PR.STARTS, p.start, function (id) { pickPref({ start: id }); }, textBtn);
    starts.style.gridTemplateColumns = 'repeat(' + PR.STARTS.length + ', minmax(0, 1fr))';
    box.appendChild(starts);
    box.appendChild(h('p', 'opt-foot', '«마지막»은 지난번에 보던 탭으로 엽니다.'));

    box.appendChild(sec('달력'));
    box.appendChild(h('p', 'opt-lb', '토·일'));
    var wk = radioGroup('segr', '달력 토·일', [{ id: 'on', nm: '토·일 넣기' }, { id: 'off', nm: '토·일 빼기' }], p.calWeekend ? 'on' : 'off', function (id) { pickPref({ calWeekend: id === 'on' }); }, textBtn);
    wk.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    box.appendChild(wk);
    box.appendChild(h('p', 'opt-lb', '주 표시'));
    var wn = radioGroup('segr', '달력 주 표시', [{ id: 'off', nm: '끄기' }, { id: 'on', nm: '«1주·2주» 켜기' }], p.calWeekNo ? 'on' : 'off', function (id) { pickPref({ calWeekNo: id === 'on' }); }, textBtn);
    wn.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    box.appendChild(wn);
    box.appendChild(h('p', 'opt-foot', '토·일을 빼면 주말 일정은 금요일 칸에 «주말 N»으로 보이고, 금요일을 누르면 목록에 나옵니다.'));

    var rs = h('div', 'opt-reset');
    rs.appendChild(btn('obtn', '화면 설정 처음대로', function () {
      if (PR) PR.reset();
      renderOptPrefs();
      schedule();
      toast('화면 설정을 처음대로 되돌렸습니다');
    }));
    box.appendChild(rs);
  }

  // ── 앱으로 설치 ─────────────────────────
  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandaloneNow() {
    try {
      return !!(S().standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true);
    } catch (e) { return !!S().standalone; }
  }
  function inAppUA() {
    return !!S().inapp || /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent || '');
  }
  function installEvt() { return PR && PR.installEvent ? PR.installEvent() : null; }

  function stepIcon(name) { var s = icon(name, '', '1.8'); return s; }
  function iosBar() {
    // 사파리 아래 줄 그림: 뒤로 · 앞으로 · [공유] · 책갈피 · 탭
    var s = svgEl('svg', { viewBox: '0 0 320 56', 'class': 'ig-bar', role: 'img', 'aria-label': '사파리 아래 줄 가운데의 공유 단추' });
    s.appendChild(svgEl('rect', { x: '1', y: '1', width: '318', height: '54', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }));
    [['M15 5 8 12l7 7', 20, false], ['m9 5 7 7-7 7', 84, false], [ICON.share, 148, true], ['M5 5h6v14H5zM13 5h6v14h-6z', 212, false], ['M5 5h11v11H5zM8 8h11v11H8z', 276, false]].forEach(function (g) {
      var p = svgEl('path', { d: g[0], transform: 'translate(' + g[1] + ' 16)', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      if (g[2]) p.setAttribute('class', 'hl');
      s.appendChild(p);
    });
    s.appendChild(svgEl('rect', { x: '138', y: '6', width: '44', height: '44', fill: 'none', 'stroke-width': '2.5', 'class': 'hl' }));
    return s;
  }
  function renderOptInstall() {
    var box = $('opt-install');
    if (!box) return;
    clear(box);
    box.appendChild(sec('앱으로 설치'));
    var w = h('div', 'ig');
    var evt = installEvt();
    if (isStandaloneNow()) {
      w.appendChild(h('p', '', '앱으로 쓰는 중입니다. 다음부터 홈 화면 아이콘으로 여세요.'));
    } else if (evt) {
      w.appendChild(h('p', '', '홈 화면에 아이콘을 두면 주소창 없이 한 번에 열립니다.'));
      w.appendChild(withId(btn('pbtn', '앱으로 설치', doInstall), 'btn-install'));
    } else if (isIOS() && inAppUA()) {
      w.appendChild(h('p', '', '카카오톡 같은 앱 안에서는 홈 화면에 추가할 수 없습니다. 먼저 사파리로 여세요.'));
      w.appendChild(withId(btn('obtn', '사파리로 열기', function () { M.openExternal(); }), 'btn-install-safari'));
    } else if (isIOS()) {
      w.appendChild(h('p', '', '아이폰은 사파리에서 홈 화면에 추가합니다.'));
      w.appendChild(iosBar());
      var ol = h('ol', 'ig-steps');
      [['share', '아래 줄 가운데 공유 단추를 누릅니다'], ['addsq', '목록을 올려 ‘홈 화면에 추가’를 누릅니다'], ['check', '오른쪽 위 ‘추가’를 누릅니다']].forEach(function (x) {
        var li = h('li');
        li.appendChild(stepIcon(x[0]));
        li.appendChild(h('span', '', x[1]));
        ol.appendChild(li);
      });
      w.appendChild(ol);
    } else {
      w.appendChild(h('p', '', '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 누르세요. 설치 단추가 안 보이면 크롬이나 삼성 인터넷으로 열어 주세요.'));
    }
    box.appendChild(w);
  }
  function doInstall() {
    var evt = installEvt();
    if (!evt) { renderOptInstall(); return; }
    try { evt.prompt(); } catch (e) { /* 무시 */ }
    var done = function (r) {
      if (PR) PR.clearInstallEvent();
      if (r && r.outcome === 'accepted') {
        setPref({ installNo: true });
        toast('홈 화면에 설치했습니다');
      }
      if (ui.overlay === 'opt') renderOptInstall();
      schedule();
    };
    if (evt.userChoice && typeof evt.userChoice.then === 'function') evt.userChoice.then(done, function () { done(null); });
    else done(null);
  }
  // 몇 번 쓴 뒤 한 번만 작은 띠로 권한다(닫으면 다시 안 띄움)
  function renderInstallBand(ready) {
    var p = prefs();
    var evt = installEvt();
    var show = !!(PR && ready && p.visits >= 3 && !p.installNo && !isStandaloneNow() && (evt || (isIOS() && !inAppUA())));
    $('band-install').hidden = !show;
    if (!show) return;
    $('band-install-tx').textContent = evt ? '홈 화면에 앱으로 두면 한 번에 열립니다' : '사파리 공유 단추 → 홈 화면에 추가로 앱처럼 쓸 수 있습니다';
    $('btn-install-go').textContent = evt ? '설치' : '방법 보기';
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
    'todo.add': '할 일 추가', 'todo.done': '할 일 체크', 'todo.edit': '할 일 고침', 'todo.del': '할 일 지움',
    'memo.add': '메모', 'memo.edit': '메모 고침', 'memo.del': '메모 지움',
    'event.add': '일정 추가', 'event.done': '일정 체크', 'dday.add': 'D-Day 추가',
    'ot.set': '초과근무', 'prog.set': '진도', 'prog.clear': '진도 지움',
    'attend.set': '출결', 'attend.clear': '출결 되돌림',
    'attend.setMany': '출결 · 여러 명', 'attend.clearMany': '출석으로 · 여러 명',
    'snote.add': '상담기록', 'snote.act': '활동기록'
  };
  function firstLine(s) {
    var t = String(s || '').split('\n')[0];
    return t.length > 40 ? t.slice(0, 40) + '…' : t;
  }
  function todoName(fp, id) {
    var v = V();
    var t0 = v ? arr(v.todos).filter(function (x) { return x.fp === fp; })[0] : null;
    if (t0) return firstLine(t0.t);
    var meta = ui.opMeta[id];
    return meta && meta.oldT ? firstLine(meta.oldT) : '할 일';
  }
  function memoName(fp, id) {
    var v = V();
    var m0 = v ? arr(v.memos).filter(function (x) { return x.fp === fp; })[0] : null;
    if (m0) return firstLine(m0.t);
    var meta = ui.opMeta[id];
    return meta && meta.oldT ? firstLine(meta.oldT) : '메모';
  }
  function eventName(p) {
    var v = V();
    var days = (v && v.days) || {};
    for (var k in days) {
      if (!Object.prototype.hasOwnProperty.call(days, k)) continue;
      var e = arr(days[k].events).filter(function (x) { return x.src === 'mine' && x.sk === p.sk && x.fp === p.fp; })[0];
      if (e) return firstLine(e.t);
    }
    return '내 일정';
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
      case 'todo.edit': return (p.t !== undefined ? firstLine(p.t) : todoName(p.fp, o.id)) + (p.due !== undefined ? ' · ' + (p.due ? md(p.due) + ' 마감' : '마감 없앰') : '');
      case 'todo.del': return todoName(p.fp, o.id);
      case 'memo.add': return firstLine(p.t);
      case 'memo.edit': return firstLine(p.t);
      case 'memo.del': return memoName(p.fp, o.id);
      case 'event.add': return md(p.date) + (p.tm ? ' ' + p.tm : '') + ' · ' + firstLine(p.t) + (isYmd(p.end) ? ' · ~' + md(p.end) : '');
      case 'event.done': return eventName(p) + (p.occ ? ' (' + md(p.occ) + ')' : '') + (p.on ? ' — 끝냄' : ' — 되돌림');
      case 'dday.add': return firstLine(p.t) + ' · ' + md(p.date);
      case 'ot.set': return md(p.date) + ' ' + (p.min > 0 ? fmtMin(p.min) : '지움');
      case 'prog.set': return (p.cls || '') + ' ' + p.p + '교시 · ' + md(p.date) + ' · ' + (p.off ? '휴강' : p.n + '차시');
      case 'prog.clear': return (p.cls || '') + ' ' + p.p + '교시 · ' + md(p.date) + ' · 기록 지움';
      case 'attend.set': return pre + stuNameIn(p.cls, p.key) + ' · ' + md(p.date) + ' · ' + recText(p.rec);
      case 'attend.clear': return pre + stuNameIn(p.cls, p.key) + ' · ' + md(p.date) + ' · 출석으로';
      case 'attend.setMany': return pre + arr(p.keys).length + '명 출결 · ' + md(p.date) + ' · ' + recText(p.rec);
      case 'attend.clearMany': return pre + arr(p.keys).length + '명 출석으로 · ' + md(p.date);
      case 'snote.add':
      case 'snote.act': return pre + (p.name || '') + ' · ' + firstLine(p.t);
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
    if (!e) return;
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
  $('fs-close').appendChild(icon('close'));
  $('btn-install-no').appendChild(icon('close'));

  $('btn-refresh').addEventListener('click', function () { M.refresh(); });
  $('btn-opt').addEventListener('click', function () { openOptions(); });
  $('opt-close').addEventListener('click', function () { closeOverlay(); });
  $('fs-close').addEventListener('click', function () { closeOverlay(); });
  $('btn-band-retry').addEventListener('click', function () { M.refresh(); });
  $('btn-external').addEventListener('click', function () { M.openExternal(); });
  $('btn-install-go').addEventListener('click', function () {
    if (installEvt()) doInstall();
    else openOptions('install');
  });
  $('btn-install-no').addEventListener('click', function () {
    setPref({ installNo: true });
    schedule();
  });
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

  // 적기 줄
  todoDP = datePicker({ id: 'todo-due', none: true, noneLabel: '없음', chips: [['0', '오늘'], ['1', '내일']], label: '날짜 고르기' });
  $('todo-date').appendChild(todoDP.el);
  evEndDP = datePicker({ id: 'ev-end', none: true, noneLabel: '없음', label: '끝나는 날 고르기' });
  $('ev-end-box').appendChild(evEndDP.el);
  qsa('#todo-form .kd').forEach(function (b) {
    b.addEventListener('click', function () { setKind(b.getAttribute('data-kind')); });
  });
  $('ev-tm').addEventListener('click', function () {
    var el = this;
    if (typeof el.showPicker === 'function') { try { el.showPicker(); } catch (e) { /* 무시 */ } }
  });
  $('todo-add').addEventListener('pointerdown', function () {
    ui.refocusTodo = document.activeElement === $('todo-t');
  });
  $('todo-add').addEventListener('click', addItem);
  $('todo-t').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); addItem(); }
  });
  setKind('todo');
  $('memo-add').addEventListener('click', addMemo);

  $('act-clear').addEventListener('click', onActClear);
  $('act-set').addEventListener('click', openSheetMany);

  $('sh-close').addEventListener('click', function () { closeOverlay(); });
  $('sh-save').addEventListener('click', saveAttend);
  $('sh-clear').addEventListener('click', clearAttend);
  $('sh-tadd').addEventListener('click', addTalk);
  $('sh-why').addEventListener('input', function () { if (ui.sheet) ui.sheet.why = this.value; });
  qsa('#sh-note-seg [data-note]').forEach(function (b) {
    b.addEventListener('click', function () { setNoteMode(b.getAttribute('data-note')); });
  });
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

  if (PR && PR.onInstall) PR.onInstall(function () { if (ui.overlay === 'opt') renderOptInstall(); schedule(); });
  var resizeT = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(schedule, 150); });

  M.on(schedule);
  render();
  M.start();
  setInterval(schedule, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) schedule(); });
})();
