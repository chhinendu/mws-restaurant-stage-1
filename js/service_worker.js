// name of the cache
const cacheName = 'restaurants-review-v1';

// cached files
const assets = [
    'https://use.fontawesome.com/releases/v5.0.8/css/solid.css',
    'https://use.fontawesome.com/releases/v5.0.8/css/fontawesome.css',
    '//cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css',
    '.',
    '/index.html',
    '/restaurant.html',
    '/css/styles.css',
    '/data/restaurants.json',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/js/service_worker.js',
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg'
];

// cache requests to all of the site’s assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName).then( cache => {
            return cache.addAll(assets);
        })
    );
});

// activate created cache
self.addEventListener('activate', e => {
    const whitelist = [cacheName];

    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (whitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// use assets from cache if exists or fetch them from the server add to cache and return
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.open(cacheName).then( cache => {
            cache.match(e.request).then(response => {
                return response || fetch(e.request).then( response => {
                    cache.put(e.request, response.clone());
                    return response;
                });
            });
        })
    );
});