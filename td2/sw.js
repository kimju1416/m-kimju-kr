/* © 2026 김주현(kimju.kr) · Teacher Desk 2 Mobile — All rights reserved. 무단 복제·수정·분해·재배포 금지. */
/* sw.js — 폰에 화면 파일을 넣어 두어 여는 시간을 줄인다(m16).
   · 첫 화면(index.html): 늘 서버에 먼저 묻는다 — 새 판을 올리면 다음 여는 순간 바로 새 판(옛 판이 붙잡히지 않게).
     단 방금(20초 안) 받은 것은 그대로 쓴다 — 구글에 열쇠 받으러 다녀오면 페이지를 한 번 더 여는데, 그때 또 묻지 않게.
     서버가 3초 안에 답이 없으면(학교 와이파이 막힘 등) 넣어 둔 것을 쓴다.
   · ?v= 붙은 파일(app.css·prefs.js·core.js·chips.js·ui.js): 판 번호가 주소에 있으니 한 번 받으면 서버에 안 묻는다.
     같은 파일의 옛 판은 새 판을 넣을 때 지운다.
   · 글꼴(cdn.jsdelivr.net, 판 번호 @ 붙은 주소만): 한 번 받으면 폰에 둔다.
   🔴 구글(로그인·드라이브) 요청은 **손대지 않는다** — 학생 자료·PC 자료는 여기 들어오지 않는다.
   🔴 판을 올릴 때 이 파일은 안 바꿔도 된다(index.html의 ?v=만 올리면 됨). 이 파일 동작을 바꿀 때만 SW_VER를 올린다.
   고장 나면: 이 파일을 «self.registration.unregister()만 하는 파일»로 바꿔 올리면 폰들이 다음 열 때 스스로 떼어 낸다. */
'use strict';
var SW_VER = 'sw1';
var APP = 'td2m-app-' + SW_VER;
var CDN = 'td2m-cdn-' + SW_VER;
var FRESH = 20 * 1000;
var WAIT = 3000;
var navAt = 0;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return /^td2m-/.test(k) && k !== APP && k !== CDN; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function scopePath() { return new URL(self.registration.scope).pathname; }
function isPage(req, u) { var sp = scopePath(); return req.mode === 'navigate' && u.origin === location.origin && (u.pathname === sp || u.pathname === sp + 'index.html'); }
function isVer(u) { return u.origin === location.origin && u.pathname.indexOf(scopePath()) === 0 && /^\?v=/.test(u.search) && /\.(js|css)$/.test(u.pathname); }
function isFont(u) { return u.hostname === 'cdn.jsdelivr.net' && /@v?\d/.test(u.pathname); }
function pageKey() { return new Request(scopePath()); }

function putPage(res) {
  return caches.open(APP).then(function (c) { return c.put(pageKey(), res); });
}
function page(e) {
  return caches.open(APP).then(function (c) { return c.match(pageKey()); }).then(function (hit) {
    if (hit && Date.now() - navAt < FRESH) return hit;
    var net = fetch(e.request).then(function (r) {
      if (r && r.ok && r.type === 'basic' && !r.redirected) { navAt = Date.now(); e.waitUntil(putPage(r.clone())); }
      return r;
    });
    if (!hit) return net;
    // 서버가 늦으면 넣어 둔 것 — 서버 답은 뒤늦게라도 넣어 둔다(다음 열 때 새 판)
    return new Promise(function (res) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; res(hit); } }, WAIT);
      net.then(function (r) { if (!done) { done = true; clearTimeout(t); res(r && r.ok ? r : hit); } },
        function () { if (!done) { done = true; clearTimeout(t); res(hit); } });
    });
  });
}
function keep(e, name, dropOld) {
  return caches.open(name).then(function (c) {
    return c.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (r) {
        if (r && r.ok && !r.redirected && (r.type === 'basic' || r.type === 'cors')) {
          var copy = r.clone();
          e.waitUntil(c.put(e.request, copy).then(function () {
            if (!dropOld) return;
            var me = new URL(e.request.url);
            return c.keys().then(function (ks) {
              return Promise.all(ks.filter(function (k) { var u = new URL(k.url); return u.pathname === me.pathname && u.search !== me.search; }).map(function (k) { return c.delete(k); }));
            });
          }));
        }
        return r;
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  if (isPage(e.request, u)) return e.respondWith(page(e));
  if (isVer(u)) return e.respondWith(keep(e, APP, true));
  if (isFont(u)) return e.respondWith(keep(e, CDN, false));
  // 그 밖(구글·아이콘·manifest 등)은 브라우저가 늘 하던 대로
});
