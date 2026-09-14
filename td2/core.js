/* core.js — 폰 페이지(m.kimju.kr/td2)의 두뇌. 화면(ui.js)은 window.TD2M 약속만 본다(dev-core.js와 같은 약속).
   · 로그인: 구글 «이동 방식»(response_type=token). 팝업(GIS)은 폰에서 popup_closed로 자주 깨져 쓰지 않는다(09-13 실측).
     열쇠(1시간)가 끝나면 기억해 둔 계정으로 prompt=none + login_hint 이동 — 화면 없이 0.3~3초에 돌아온다(안드로이드·아이폰 실측).
   · 드라이브: 앱 전용 숨김 칸(appDataFolder). PC가 올린 td2-mobile.json을 읽고, 입력은 한 건마다 m-op-<ms>-<id>.json 새 파일로 올린다.
   🔴 td2-sync.json(PC끼리 쓰는 문서 — 키·생기부가 들어 있다)은 읽지 않는다.
   🔴 학생 자료(attend·talk)는 폰에 저장하지 않는다 — 메모리에만. 저장하는 것: 계정 이메일·1시간 열쇠·못 올린 입력·학생 자료를 뺀 보기 사본.
   형식: TeacherDesk2 저장소 docs/mobile-sync/SCHEMA.md */
(function () {
  'use strict';

  var CLIENT_ID = '754496044374-gc8735jipgc80k0lelvrvlbu2l75t822.apps.googleusercontent.com';
  var SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.appdata';
  var SCOPE = 'openid email ' + SCOPE_DRIVE;
  var EP = { auth: 'https://accounts.google.com', api: 'https://www.googleapis.com', oidc: 'https://openidconnect.googleapis.com' };
  /* 검사 전용 — 내 PC(127.0.0.1·localhost)에서 열었을 때만 가짜 구글 주소를 받는다. 배포 주소에서는 절대 안 바뀐다 */
  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && window.TD2M_TEST && window.TD2M_TEST.fake) {
    EP = { auth: window.TD2M_TEST.fake, api: window.TD2M_TEST.fake, oidc: window.TD2M_TEST.fake };
  }
  var VIEW = 'td2-mobile.json';
  var P = 'td2m:';
  var KEEP_DONE = 60 * 1000;          // 반영·거절된 입력을 목록에 남겨 두는 시간
  var POLL_WAIT = 20 * 1000;          // PC 반영을 기다리는 동안 새로 받기 간격
  var POLL_IDLE = 5 * 60 * 1000;
  var HERE = (function () {
    var p = location.pathname;
    if (!/\/$/.test(p)) p = /\.[a-z0-9]+$/i.test(p) ? p.replace(/[^/]*$/, '') : p + '/';
    return location.origin + p;
  })();

  var listeners = [];
  var state = {
    phase: 'boot', email: '', view: null, viewAt: 0, pending: [], busy: false,
    err: '', errCode: '', inapp: isInapp(), standalone: isStandalone()
  };
  var started = false, pollTimer = null, flushing = false, loadingView = null;

  /* ── 작은 도구 ── */
  function lsGet(k, d) { try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(P + k); else localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* 사생활 보호 모드 — 이번에만 */ } }
  function emit() { listeners.slice().forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  function set(patch) { Object.keys(patch).forEach(function (k) { state[k] = patch[k]; }); emit(); }
  function rid() {
    var a = new Uint8Array(8); window.crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function isStandalone() {
    try { return !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true); } catch (e) { return false; }
  }
  function isInapp() { return /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(|Line\/|DaumApps|everytimeApp/i.test(navigator.userAgent || ''); }
  function devName() {
    var ua = navigator.userAgent || '';
    var os = /iPhone|iPad|iPod/.test(ua) ? '아이폰' : /Android/.test(ua) ? '안드로이드' : '폰';
    var br = /KAKAOTALK/i.test(ua) ? '카카오톡' : /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /CriOS|Chrome/.test(ua) ? '크롬' : /Safari/.test(ua) ? '사파리' : '브라우저';
    return os + ' ' + br + (isStandalone() ? '(아이콘)' : '');
  }
  function gErr(code, msg) { var e = new Error(msg || code); e.code = code; return e; }

  /* ── 열쇠 ── */
  function tok() { var t = lsGet('tok', null); return t && t.exp > Date.now() + 30000 ? t.access : ''; }
  function goGoogle(prompt, hint) {
    var st = rid();
    lsSet('rd', { state: st, prompt: prompt || '', at: Date.now() });
    var q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: HERE, response_type: 'token', scope: SCOPE, state: st, include_granted_scopes: 'true' });
    if (prompt) q.set('prompt', prompt);
    if (hint) q.set('login_hint', hint);
    location.assign(EP.auth + '/o/oauth2/v2/auth?' + q.toString());
  }
  /* 조용히 다시 받기 — 1분 안에 한 번만(돌아와서 또 실패하면 돌고 돌지 않게) */
  function silent() {
    var email = lsGet('email', '');
    var last = lsGet('silentAt', 0);
    if (!email || Date.now() - last < 60000) return false;
    lsSet('silentAt', Date.now());
    goGoogle('none', email);
    return true;
  }
  /* 구글에서 돌아왔나 — 주소 뒤(#)의 열쇠·오류를 읽고 곧바로 지운다(화면·기록에 안 남게) */
  function catchReturn() {
    if (location.hash.length < 2) return null;
    var h = new URLSearchParams(location.hash.slice(1));
    if (!h.get('access_token') && !h.get('error')) return null;
    history.replaceState(null, '', location.pathname + location.search);
    var rd = lsGet('rd', null);
    lsSet('rd', null);
    if (!rd || rd.state !== h.get('state')) return { err: 'state' };
    if (h.get('error')) return { err: h.get('error'), prompt: rd.prompt };
    var granted = String(h.get('scope') || '').split(/\s+/);
    if (h.get('scope') && granted.indexOf(SCOPE_DRIVE) < 0) return { err: 'no-drive' };
    lsSet('tok', { access: h.get('access_token'), exp: Date.now() + Math.max(60, +h.get('expires_in') || 3600) * 1000 });
    lsSet('silentAt', 0);
    return { ok: true, prompt: rd.prompt };
  }

  /* ── 구글 요청 ── */
  function call(url, opt, ms) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 20000) : null;
    var o = opt || {};
    if (ctrl) o.signal = ctrl.signal;
    return fetch(url, o).then(function (r) { clearTimeout(t); return r; }, function () { clearTimeout(t); throw gErr('net', '인터넷에 연결하지 못했습니다'); });
  }
  function api(method, url, body, headers, raw) {
    var access = tok();
    if (!access) return Promise.reject(gErr('auth', '로그인이 끝났습니다'));
    var h = { Authorization: 'Bearer ' + access };
    Object.keys(headers || {}).forEach(function (k) { h[k] = headers[k]; });
    return call(url, { method: method, headers: h, body: body }).then(function (r) {
      if (r.status === 401) { lsSet('tok', null); throw gErr('auth', '로그인이 끝났습니다'); }
      if (r.status === 404) throw gErr('not-found', '파일이 없습니다');
      if (!r.ok) {
        return r.text().then(function (t) {
          if (r.status === 403 && /insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(t)) throw gErr('no-drive', '구글 드라이브 허락이 없습니다');
          throw gErr('http', '구글 드라이브 오류 ' + r.status);
        });
      }
      if (raw) return r.text();
      return r.status === 204 ? null : r.json().catch(function () { throw gErr('net', '구글 드라이브가 아닌 응답이 왔습니다 — 와이파이가 막고 있을 수 있어요'); });
    });
  }
  function fetchEmail() {
    return api('GET', EP.oidc + '/v1/userinfo').then(function (j) { var e = String((j && j.email) || ''); if (e) lsSet('email', e); return e; }, function () { return ''; });
  }

  /* ── 보기 파일 ── */
  function stripStudents(v) { var c = clone(v); if (c) { delete c.attend; delete c.talk; } return c; }
  function loadView() {
    if (loadingView) return loadingView;
    var q = new URLSearchParams({ spaces: 'appDataFolder', q: "name='" + VIEW + "'", orderBy: 'modifiedTime desc', pageSize: '5', fields: 'files(id,name,modifiedTime)' });
    loadingView = api('GET', EP.api + '/drive/v3/files?' + q.toString()).then(function (j) {
      var f = j && Array.isArray(j.files) ? j.files.filter(function (x) { return x.name === VIEW; })[0] : null;
      if (!j || !Array.isArray(j.files)) throw gErr('net', '구글 드라이브가 아닌 응답이 왔습니다 — 와이파이가 막고 있을 수 있어요');
      if (!f) throw gErr('no-view', 'PC가 올린 폰 자료가 없습니다');
      return api('GET', EP.api + '/drive/v3/files/' + encodeURIComponent(f.id) + '?alt=media', null, null, true);
    }).then(function (text) {
      var v;
      try { v = JSON.parse(text); } catch (e) { throw gErr('net', '폰 자료를 끝까지 받지 못했습니다'); }
      if (!v || v.app !== 'TeacherDesk2' || v.kind !== 'mobile-view') throw gErr('no-view', 'PC가 올린 폰 자료가 없습니다');
      if (+v.v > 1) throw gErr('newer', 'PC 앱이 더 새 형식으로 자료를 올렸습니다');
      markPending(v);
      lsSet('view', stripStudents(v));
      set({ phase: 'ready', view: v, viewAt: Date.now(), err: '', errCode: '', email: lsGet('email', state.email) });
      return v;
    });
    var done = function () { loadingView = null; };
    loadingView.then(done, done);
    return loadingView;
  }
  function markPending(v) {
    var ap = {}, rj = {};
    (v.applied || []).forEach(function (id) { ap[id] = 1; });
    (v.rejected || []).forEach(function (x) { if (x && x.id) rj[x.id] = String(x.why || '반영하지 못했습니다'); });
    var now = Date.now(), changed = false;
    state.pending = state.pending.filter(function (o) {
      if ((o.status === 'applied' || o.status === 'rejected') && now - (o.doneAt || now) > KEEP_DONE) { changed = true; return false; }
      return true;
    }).map(function (o) {
      if (o.status !== 'sent' && o.status !== 'queued') return o;
      if (ap[o.id]) { changed = true; return merge(o, { status: 'applied', doneAt: now }); }
      if (rj[o.id]) { changed = true; return merge(o, { status: 'rejected', why: rj[o.id], doneAt: now }); }
      return o;
    });
    if (changed) savePending();
  }
  function merge(a, b) { var o = {}; Object.keys(a).forEach(function (k) { o[k] = a[k]; }); Object.keys(b).forEach(function (k) { o[k] = b[k]; }); return o; }
  function savePending() {
    // 학생 입력(출결·상담)도 올릴 때까지는 남겨야 잃지 않는다 — 올리고 반영되면 지운다
    lsSet('pending', state.pending.filter(function (o) { return o.status === 'queued' || o.status === 'sent'; }));
  }

  /* ── 입력 올리기 ── */
  function upload(o) {
    var name = 'm-op-' + Date.now() + '-' + o.id + '.json';
    var body = JSON.stringify({ app: 'TeacherDesk2', kind: 'mobile-op', v: 1, id: o.id, at: o.at, dev: devName(), type: o.type, p: o.p });
    var B = 'td2m' + rid();
    var meta = JSON.stringify({ name: name, parents: ['appDataFolder'] });
    var multi = '--' + B + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + B +
      '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + body + '\r\n--' + B + '--';
    return api('POST', EP.api + '/upload/drive/v3/files?uploadType=multipart&fields=id', new Blob([multi]), { 'Content-Type': 'multipart/related; boundary=' + B })
      .then(function (r) { if (!r || !r.id) throw gErr('net', '구글 드라이브가 아닌 응답이 왔습니다'); });
  }
  function flush() {
    if (flushing) return Promise.resolve();
    var todo = state.pending.filter(function (o) { return o.status === 'queued'; });
    if (!todo.length || !tok()) return Promise.resolve();
    flushing = true;
    var chain = Promise.resolve();
    todo.forEach(function (o) {
      chain = chain.then(function () {
        return upload(o).then(function () {
          state.pending = state.pending.map(function (x) { return x.id === o.id ? merge(x, { status: 'sent', sentAt: Date.now() }) : x; });
          savePending(); emit();
        });
      });
    });
    /* 🔴 올리는 동안 새로 적은 것은 이번 차례에 안 들어 있다 — 끝나자마자 한 번 더 돌린다.
       안 그러면 여러 개를 연달아 적을 때 뒤엣것들이 새로 받기(20초)까지 «올리기 대기»에 머문다(끝까지 검사에서 잡음) */
    return chain.then(function () {
      flushing = false;
      if (tok() && state.pending.some(function (o) { return o.status === 'queued'; })) return flush();
      schedule();
    }, function (e) {
      flushing = false;
      if (e.code === 'auth') { if (!silent()) set({ phase: 'login', err: '', errCode: '' }); return; }
      if (e.code === 'no-drive') { set({ phase: 'error', errCode: 'no-drive', err: e.message }); return; }
      set({ err: '적은 것을 아직 올리지 못했습니다 — 연결되면 다시 올립니다', errCode: 'net' });
      schedule();
    });
  }
  function schedule() {
    clearTimeout(pollTimer);
    if (state.phase !== 'ready') return;
    var waiting = state.pending.some(function (o) { return o.status === 'sent' || o.status === 'queued'; });
    pollTimer = setTimeout(function () { if (document.visibilityState !== 'hidden') refresh(); else schedule(); }, waiting ? POLL_WAIT : POLL_IDLE);
  }

  function failTo(e) {
    if (e.code === 'auth') { if (silent()) return; set({ phase: 'login', err: '', errCode: '' }); return; }
    if (state.view && (e.code === 'net' || e.code === 'http')) { set({ phase: 'ready', busy: false, err: e.message, errCode: 'net' }); schedule(); return; }
    set({ phase: 'error', busy: false, err: e.message, errCode: e.code === 'http' ? 'net' : (e.code || 'net') });
  }

  /* ── 공개 약속 ── */
  function on(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }
  function start() {
    if (started) return;
    started = true;
    state.pending = (lsGet('pending', []) || []).filter(function (o) { return o && o.id && o.type; });
    state.email = lsGet('email', '');
    var back = catchReturn();
    if (back && back.err) {
      if (back.err === 'no-drive') { set({ phase: 'error', errCode: 'no-drive', err: '구글 드라이브 허락이 없습니다' }); return; }
      // 조용히 받기가 «계정 고르기·동의가 필요»로 돌아왔다 — 로그인 단추를 보여 준다
      if (back.prompt === 'none' || /interaction_required|login_required|consent_required|account_selection_required/.test(back.err)) { set({ phase: 'login' }); return; }
      set({ phase: 'login', err: back.err === 'access_denied' ? '구글에서 허용하지 않았습니다' : '로그인하지 못했습니다 — 다시 눌러 주세요' });
      return;
    }
    var cached = lsGet('view', null);
    if (!tok()) {
      if (silent()) return;
      set({ phase: 'login', view: null });
      return;
    }
    if (cached && cached.kind === 'mobile-view') set({ phase: 'ready', view: cached, viewAt: 0, busy: true });
    else set({ busy: true });
    (state.email ? Promise.resolve(state.email) : fetchEmail()).then(function (email) {
      state.email = email;
      return loadView();
    }).then(function () { set({ busy: false }); return flush(); }).then(schedule, failTo);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && state.phase === 'ready' && Date.now() - state.viewAt > 60000) refresh();
    });
    window.addEventListener('online', function () { if (state.phase === 'ready') refresh(); });
  }
  function login() {
    // 드라이브 칸을 안 켜고 돌아왔으면 허락 화면을 다시 보여 준다(consent) — 칸이 보이게
    goGoogle(state.errCode === 'no-drive' ? 'consent select_account' : 'select_account', '');
  }
  function logout() {
    ['tok', 'email', 'view', 'pending', 'silentAt', 'rd'].forEach(function (k) { lsSet(k, null); });
    clearTimeout(pollTimer);
    set({ phase: 'login', email: '', view: null, viewAt: 0, pending: [], busy: false, err: '', errCode: '' });
  }
  function refresh() {
    if (state.busy) return;
    if (!tok()) { if (!silent()) set({ phase: 'login' }); return; }
    set({ busy: true });
    flush().then(loadView).then(function () { set({ busy: false }); schedule(); }, failTo);
  }
  var TYPES = {
    'todo.add': 1, 'todo.done': 1, 'todo.edit': 1, 'todo.del': 1, 'memo.add': 1, 'memo.edit': 1, 'memo.del': 1,
    'event.add': 1, 'event.done': 1, 'dday.add': 1, 'ot.set': 1, 'prog.set': 1, 'prog.clear': 1,
    'attend.set': 1, 'attend.clear': 1, 'attend.setMany': 1, 'attend.clearMany': 1, 'snote.add': 1, 'snote.act': 1
  };
  function op(type, p) {
    if (!TYPES[type]) throw new Error('모르는 입력 종류: ' + type);
    var o = { id: rid(), type: type, p: clone(p || {}), at: new Date().toISOString(), status: 'queued' };
    state.pending = state.pending.concat([o]);
    savePending(); emit();
    flush();
    return o;
  }
  /* 카카오톡 등 앱 안 브라우저 → 기본 브라우저로. 안드로이드 크롬은 intent, 카카오톡은 제 전용 주소 */
  function openExternal() {
    var url = HERE;
    var ua = navigator.userAgent || '';
    if (/KAKAOTALK/i.test(ua)) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
    if (/Android/.test(ua)) { location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; return; }
    try { navigator.clipboard.writeText(url); } catch (e) { /* 못 복사해도 그만 */ }
  }

  window.TD2M = { state: state, on: on, start: start, login: login, logout: logout, refresh: refresh, op: op, openExternal: openExternal };
})();
