/* prefs.js — 폰마다 저장한 화면 설정(localStorage 'td2m:ui')을 첫 그림 전에 적용한다.
   <head>에서 동기로 읽힌다(인라인 스크립트는 CSP로 막혀 있어 파일로 둔다).
   ui.js는 window.TD2PREFS로 읽고 바꾼다. 학생 자료는 여기에 넣지 않는다.
   «앱으로 설치» 이벤트(beforeinstallprompt)도 여기서 먼저 받아 둔다 — ui.js가 읽히기 전에 올 수 있어서. */
(function () {
  'use strict';

  var KEY = 'td2m:ui';
  var OLD_TAB_KEY = 'td2m.tab';      // 1차 화면이 쓰던 탭 기억
  var FS = 'https://cdn.jsdelivr.net/npm/@fontsource/';

  // hd = 머리띠 색(주소창·상태 표시줄 색에도 씀)
  var THEMES = [
    { id: 'base', nm: '기본', hd: '#141414' },
    { id: 'dark', nm: '다크', hd: '#000000' },
    { id: 'navy', nm: '네이비', hd: '#14284B' },
    { id: 'green', nm: '칠판', hd: '#1D3B2A' },
    { id: 'paper', nm: '종이', hd: '#2A241C' },
    { id: 'hc', nm: '고대비', hd: '#000000' }
  ];
  var ACCENTS = [
    { id: 'red', nm: '빨강' },
    { id: 'blue', nm: '파랑' },
    { id: 'green', nm: '초록' },
    { id: 'orange', nm: '주황' },
    { id: 'teal', nm: '청록' }
  ];
  // css: 고르면 그때 받는 글꼴 CSS (jsdelivr만 — CSP style-src/font-src)
  var FONTS = [
    { id: 'pretendard', nm: 'Pretendard', note: '기본', css: [] },
    { id: 'system', nm: '기기 기본 글꼴', note: '받지 않음', css: [] },
    { id: 'nanum', nm: '나눔고딕', note: '처음 고를 때 받음', css: [FS + 'nanum-gothic@5.3.0/400.css', FS + 'nanum-gothic@5.3.0/700.css', FS + 'nanum-gothic@5.3.0/800.css'] },
    { id: 'plex', nm: 'IBM Plex Sans KR', note: '처음 고를 때 받음', css: [FS + 'ibm-plex-sans-kr@5.3.0/400.css', FS + 'ibm-plex-sans-kr@5.3.0/600.css', FS + 'ibm-plex-sans-kr@5.3.0/700.css'] }
  ];
  var SIZES = [{ id: 's', nm: '작게' }, { id: 'm', nm: '보통' }, { id: 'l', nm: '크게' }];
  var STARTS = [{ id: 'last', nm: '마지막' }, { id: 'cal', nm: '캘린더' }, { id: 'today', nm: '오늘' }, { id: 'memo', nm: '메모' }, { id: 'stu', nm: '학생' }];
  var TABS = ['cal', 'today', 'memo', 'stu'];
  // calWeekend: 달력에 토·일 칸 · calWeekNo: 달력 줄 왼쪽에 «1주·2주»
  // visits: 이 폰에서 자료를 받은 횟수(설치 권하기용) · installNo: 설치 권하기를 닫았거나 설치함
  var DEF = { theme: 'base', accent: 'red', font: 'pretendard', size: 'm', start: 'last', tab: 'cal', calWeekend: true, calWeekNo: false, visits: 0, installNo: false };

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function norm(o) {
    o = o && typeof o === 'object' ? o : {};
    return {
      theme: find(THEMES, o.theme) ? o.theme : DEF.theme,
      accent: find(ACCENTS, o.accent) ? o.accent : DEF.accent,
      font: find(FONTS, o.font) ? o.font : DEF.font,
      size: find(SIZES, o.size) ? o.size : DEF.size,
      start: find(STARTS, o.start) ? o.start : DEF.start,
      tab: TABS.indexOf(o.tab) >= 0 ? o.tab : DEF.tab,
      calWeekend: o.calWeekend !== false,
      calWeekNo: o.calWeekNo === true,
      visits: (typeof o.visits === 'number' && isFinite(o.visits) && o.visits > 0) ? Math.min(999, Math.floor(o.visits)) : 0,
      installNo: o.installNo === true
    };
  }
  function copy(p) {
    return { theme: p.theme, accent: p.accent, font: p.font, size: p.size, start: p.start, tab: p.tab, calWeekend: p.calWeekend, calWeekNo: p.calWeekNo, visits: p.visits, installNo: p.installNo };
  }
  function read() {
    var o = null;
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) o = JSON.parse(raw);
      if (!o) {
        var t = window.localStorage.getItem(OLD_TAB_KEY);
        if (t) o = { tab: t };
      }
    } catch (e) { o = null; }
    return norm(o);
  }
  function write(p) {
    try { window.localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch (e) { return false; }
  }

  var added = {};
  function addCss(href) {
    if (added[href]) return;
    added[href] = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    (document.head || document.documentElement).appendChild(l);
  }

  function apply(p) {
    var de = document.documentElement;
    de.setAttribute('data-theme', p.theme);
    de.setAttribute('data-acc', p.accent);
    de.setAttribute('data-font', p.font);
    de.setAttribute('data-fs', p.size);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', find(THEMES, p.theme).hd);
    find(FONTS, p.font).css.forEach(addCss);
  }

  var cur = read();
  apply(cur);

  // ── 앱으로 설치 ─────────────────────────
  var installEvt = null;
  var installFns = [];
  function fireInstall() {
    installFns.slice().forEach(function (fn) { try { fn(); } catch (e) { /* 무시 */ } });
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();              // 크롬 기본 안내 대신 설정·작은 띠에서 권한다
    installEvt = e;
    fireInstall();
  });
  window.addEventListener('appinstalled', function () {
    installEvt = null;
    cur.installNo = true;
    write(cur);
    fireInstall();
  });

  window.TD2PREFS = {
    KEY: KEY,
    THEMES: THEMES,
    ACCENTS: ACCENTS,
    FONTS: FONTS,
    SIZES: SIZES,
    STARTS: STARTS,
    get: function () { return copy(cur); },
    set: function (patch) {
      var n = copy(cur);
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) n[k] = patch[k];
      }
      cur = norm(n);
      apply(cur);
      return write(cur);
    },
    reset: function () {
      cur = norm({ tab: cur.tab, visits: cur.visits, installNo: cur.installNo });
      apply(cur);
      return write(cur);
    },
    // 설정 화면에서 글꼴 미리보기용 (글꼴 파일은 보이는 글자만큼만 받는다)
    loadAllFonts: function () {
      FONTS.forEach(function (f) { f.css.forEach(addCss); });
    },
    installEvent: function () { return installEvt; },
    clearInstallEvent: function () { installEvt = null; },
    onInstall: function (fn) { if (typeof fn === 'function') installFns.push(fn); }
  };
})();
