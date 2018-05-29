/**
 * Common database helper functions.
 */

/**
 * Register Service worker
 */
if (navigator.serviceWorker) {
    navigator.serviceWorker.register('./service_worker.js').then((registration) => {
        console.log('Registration successful, scope is:', registration.scope);
    })
        .then(registration => navigator.serviceWorker.ready)
        .then(registration => registration.sync.register('syncReviews').then(() => console.log('Sync registered')))
        .catch((error) => {
            console.log('Service worker registration failed, error:', error);
        });
}


class DBHelper {
    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}`;
    }

    static openRestaurantDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return indexDB.open('restaurantDb', 1, function (upgradeDb) {
            let store = upgradeDb.createObjectStore('restaurantDbs', {
                keyPath: 'id'
            });
            store.createIndex('by-id', 'id');
        });
    }

    static openReviewDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return indexDB.open('reviewDb', 1, function (upgradeDb) {
            let store = upgradeDb.createObjectStore('reviewDbs', {
                keyPath: 'id'
            });
            store.createIndex('by-id', 'id');
        });
    }

    static openLocalReviewDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return indexDB.open('localReviewDb', 1, function (upgradeDb) {
            let store = upgradeDb.createObjectStore('localReviewDbs', {
                keyPath: 'restaurant_id'
            });
            store.createIndex('by-id', 'restaurant_id');
        });
    }

    static saveToRestaurantDatabase(data) {
        return DBHelper.openRestaurantDatabase().then(function (db) {
            if (!db) {
                return;
            }

            let tx = db.transaction('restaurantDbs', 'readwrite');
            let store = tx.objectStore('restaurantDbs');
            data.forEach(function (restaurant) {
                store.put(restaurant);
            });
            return tx.complete;
        });
    }

    static saveToReviewDatabase(data) {
        return DBHelper.openReviewDatabase().then(function (db) {
            if (!db) {
                return;
            }

            let tx = db.transaction('reviewDbs', 'readwrite');
            let store = tx.objectStore('reviewDbs');
            data.forEach(function (review) {
                store.put(review);
            });
            return tx.complete;
        });
    }

    static addRestaurantsFromAPI() {
        return fetch(`${DBHelper.DATABASE_URL}/restaurants`)
            .then(function (response) {
                return response.json();
            }).then(restaurants => {
                DBHelper.saveToRestaurantDatabase(restaurants);
                return restaurants;
            });
    }

    static addReviewsFromAPI() {
        return fetch(`${DBHelper.DATABASE_URL}/reviews`)
            .then(function (response) {
                return response.json();
            }).then(reviews => {
                DBHelper.saveToReviewDatabase(reviews);
                return reviews;
            });
    }

    static getStoredRestaurants() {
        return DBHelper.openRestaurantDatabase().then(function (db) {
            if (!db) {
                return;
            }
            let store = db.transaction('restaurantDbs').objectStore('restaurantDbs');
            return store.getAll();
        });
    }

    static getStoredReviews() {
        return DBHelper.openReviewDatabase().then(function (db) {
            if (!db) {
                return;
            }
            let store = db.transaction('reviewDbs').objectStore('reviewDbs');
            return store.getAll();
        });
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback) {
        return DBHelper.addRestaurantsFromAPI()
            .then(restaurants => callback(null, restaurants))
            .catch(error => {
                DBHelper.getStoredRestaurants()
                    .then(restaurants => callback(null, restaurants))
                    .catch(error => callback(error, null));
            });
    }

    /**
     * Fetch all reviews.
     */
    static fetchReviews(callback) {
        return DBHelper.addReviewsFromAPI()
            .then(reviews => callback(null, reviews))
            .catch(error => {
                DBHelper.getStoredReviews()
                    .then(reviews => callback(null, reviews))
                    .catch(error => callback(error, null));
            });
    }


    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            }
            else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                }
                else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
        });
    }

    /**
     * Fetch reviews by restaurant
     */
    static fetchReviewsByRestaurant(restaurantId, callback) {
        DBHelper.fetchReviews((error, reviewList) => {
            if (error) {
                callback(error, null);
            }
            else {
                const reviews = reviewList.filter(r => r.restaurant_id == restaurantId);
                if (reviews) { // Got the restaurant
                    callback(null, reviews);
                }
                else { // Restaurant does not exist in the database
                    callback('Reviews does not exist', null);
                }
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            }
            else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            }
            else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            }
            else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            }
            else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            }
            else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.id}.webp`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
                position: restaurant.latlng,
                title: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant),
                map: map,
                animation: google.maps.Animation.DROP
            }
        );
        return marker;
    }

    static addRestaurantToFavorites(restaurantId, isFav, callback) {
        const url = DBHelper.DATABASE_URL + '/restaurants/' + restaurantId + '/?is_favorite=' + isFav;
        fetch(url, {method: 'put'})
            .then(res => callback(null, 1))
            .catch(err => callback(err, null));
    }


}
