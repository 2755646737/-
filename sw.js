// 缓存名称配置
const CACHE_NAME = 'pwa-cache-shujuku-v1';
// 预缓存列表：仅保留项目核心基础文件
const PRECACHE_LIST = [
  '/',
  '/index.html',
  '/idb.js',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];
// 请求方法白名单：仅缓存GET/HEAD请求
const ALLOWED_CACHE_METHODS = ['GET', 'HEAD'];

// 安装事件：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const url of PRECACHE_LIST) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`✅ 预缓存成功：${url}`);
            } else {
              console.warn(`⚠️ 预缓存失败：${url}（状态码：${response.status}）`);
            }
          } catch (err) {
            console.error(`❌ 预缓存请求失败：${url}`, err);
          }
        }
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW安装失败：', err))
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(`🗑️ 删除旧缓存：${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
      .catch(err => console.error('SW激活失败：', err))
  );
});

// Fetch事件：基础缓存逻辑（无亚盘接口处理）
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http') || event.request.url.includes('devtools')) {
    return;
  }

  const isMethodAllowed = ALLOWED_CACHE_METHODS.includes(event.request.method);

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);

        if (isMethodAllowed) {
          const responseClone = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, responseClone);
          console.log(`💾 缓存成功：${event.request.url}`);
        }

        return networkResponse;
      } catch (err) {
        console.log(`📴 网络请求失败，尝试读取缓存：${event.request.url}`);

        if (isMethodAllowed) {
          const baseCache = await caches.open(CACHE_NAME);
          const cached = await baseCache.match(event.request);
          if (cached) return cached;
        }

        // 离线友好提示
        return new Response(
          '<h1>📴 你已离线</h1><p>当前无法访问网络，仅能查看缓存的页面内容</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })()
  );
});

// 屏蔽devtools相关错误
self.addEventListener('message', (e) => {
  try {
    if (chrome?.runtime?.lastError) return;
  } catch (err) {}
});

self.addEventListener('error', (e) => {
  const ignoreMessages = ['devtools', 'runtime.lastError', 'POST is unsupported'];
  if (ignoreMessages.some(msg => e.message.includes(msg))) {
    e.preventDefault();
  }
});

// 网络状态通知
self.addEventListener('offline', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'OFFLINE', msg: '当前网络已断开，将使用缓存数据' });
    });
  });
});

self.addEventListener('online', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'ONLINE', msg: '网络已恢复，正在刷新内容' });
    });
  });
});