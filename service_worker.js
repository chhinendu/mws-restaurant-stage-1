self.importScripts('js/indexDB.js', 'js/dbhelper.js');
// name of the cache
const cacheName = 'restaurants-review-v3';

// cached files
const assets = [
    'https://use.fontawesome.com/releases/v5.0.8/css/solid.css',
    'https://use.fontawesome.com/releases/v5.0.8/css/fontawesome.css',
    'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/loadjs/3.5.4/loadjs.min.js',
    '/',
    '/index.html',
    '/restaurant.html',
    '/css/styles.css',
    '/js/dbhelper.js',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/js/indexDB.js',
    '/img/1.webp',
    '/img/2.webp',
    '/img/3.webp',
    '/img/4.webp',
    '/img/5.webp',
    '/img/6.webp',
    '/img/7.webp',
    '/img/8.webp',
    '/img/9.webp',
    '/img/10.webp'
];

// cache requests to all of the site’s assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName).then(cache => {
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
        caches.open(cacheName).then(cache => {
            return cache.match(e.request).then(response => {
                return response || fetch(e.request).then(response => {
                    if (e.request.url.includes('localhost')) {
                        cache.put(e.request, response.clone());
                    }
                    return response;
                });
            });
        })
    );
});

self.addEventListener('sync', e => {
    if (e.tag === 'syncReviews') {
        DBHelper.openLocalReviewDatabase().then(db => {
            let tx = db.transaction('localReviewDbs');
            let restaurantStore = tx.objectStore('localReviewDbs');
            return restaurantStore.getAll();
        }).then(val => {
            val.forEach(function (review) {
                const url = `${DBHelper.DATABASE_URL}reviews/?restaurant_id=${review.restaurant_id}`;
                fetch(url, {
                    method: 'POST',
                    body: JSON.stringify(review),
                    headers: {
                        'content-type': 'application/json'
                    },
                })
                    .then(response => response.json())
                    .then(function (val) {
                        DBHelper.openLocalReviewDatabase().then(function (db) {
                            let tx = db.transaction('localReviewDbs');
                            let restaurantStore = tx.objectStore('localReviewDbs');
                            restaurantStore.delete(review.restaurant_id)
                        });
                    }).catch(function (error) {
                    console.log(error);
                });
            });
        });
    }
});