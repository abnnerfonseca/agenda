const VERSION='v1';
const APP='igreja-app-'+VERSION;
const FONTS='igreja-fonts';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
const SCOPE_PATH=new URL(self.registration.scope).pathname;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(APP).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('igreja-app-')&&k!==APP).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(req.headers.has('range')||/\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        const isHome=url.pathname===SCOPE_PATH||url.pathname===SCOPE_PATH+'index.html';
        if(res.ok&&isHome){const copy=res.clone();caches.open(APP).then(c=>c.put('index.html',copy));}
        return res;
      }).catch(()=>caches.match('index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  if(url.origin===self.location.origin){
    e.respondWith(
      caches.open(APP).then(c=>c.match(req).then(hit=>{
        const net=fetch(req).then(res=>{if(res.ok) c.put(req,res.clone());return res;}).catch(()=>hit);
        return hit||net;
      }))
    );
    return;
  }

  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(
      caches.open(FONTS).then(c=>c.match(req).then(hit=>{
        if(hit) return hit;
        return fetch(req).then(res=>{if(res.ok||res.type==='opaque') c.put(req,res.clone());return res;});
      }))
    );
  }
});
