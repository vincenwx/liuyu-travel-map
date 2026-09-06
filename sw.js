// 刘羽自驾点位图 - Service Worker
// HTML: network-first(更新即时可见,离线回落缓存)
// 高德瓦片/Leaflet CDN: 缓存优先 -> 已浏览区域可离线查看(全图离线不现实,别夸大)
const CACHE = 'liuyu-map-v2';
const CORE = ['./pilot_map_mobile.html', './manifest.json', './icon-192.png', './icon-512.png',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const sameOrigin = url.startsWith(self.location.origin);
  const isMapAsset = /autonavi\.com|jsdelivr\.net/.test(url);
  if (!sameOrigin && !isMapAsset) return;
  // 本站 HTML: 网络优先
  if (sameOrigin && (url.endsWith('.html') || url.endsWith('/'))) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./pilot_map_mobile.html')))
    );
    return;
  }
  // 瓦片与库: 缓存优先(瓦片 URL 含 z/x/y 不可变,可永久缓存)
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (resp && (resp.ok || resp.type === 'opaque')) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }).catch(() => caches.match(e.request)))
  );
});
