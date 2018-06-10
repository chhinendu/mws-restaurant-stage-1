let restaurant;
let reviews;
var map;
let map_latlang;

document.addEventListener('DOMContentLoaded', (event) => {
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) { // Got an error!
            console.error(error);
        }
        else {
            fillBreadcrumb();
        }
    });
});

window.addEventListener('load', function() {

    function updateOnlineStatus(event) {
        DBHelper.openLocalReviewDatabase().then(db => {
            if (!db) {
                return;
            }
            let tx = db.transaction('localReviewDbs', 'readwrite');
            let restaurantStore = tx.objectStore('localReviewDbs');
            return restaurantStore.getAll();
        }).then(val => {
            val.forEach(function (review) {
                const url = `${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${review.restaurant_id}`;
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
                            if (!db) {
                                return;
                            }
                            let tx = db.transaction('localReviewDbs', 'readwrite');
                            let restaurantStore = tx.objectStore('localReviewDbs');
                            restaurantStore.delete(review.restaurant_id)
                        });
                    }).catch(function (error) {
                    console.log(error);
                });
            });
        });
    }

    window.addEventListener('online',  updateOnlineStatus);
})

/**
 * Initialize Google map, called from HTML.
 */

window.initMap = () => {
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: map_latlang,
        scrollwheel: false
    });


    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
}

google_maps_lazyload = (api_key) => {
    const options = {
        rootMargin: '400px',
        threshold: 0
    };

    const map = document.getElementById('map');

    const observer = new IntersectionObserver(
        function (entries, observer) {
            // Detect intersection https://calendar.perfplanet.com/2017/progressive-image-loading-using-intersection-observer-and-sqip/#comment-102838
            const isIntersecting = typeof entries[0].isIntersecting === 'boolean' ? entries[0].isIntersecting : entries[0].intersectionRatio > 0;
            if (isIntersecting) {
                loadjs('https://maps.googleapis.com/maps/api/js?callback=initMap&libraries=places&key=' + api_key)
                observer.unobserve(map);
            }
        },
        options
    );

    observer.observe(map);

}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant)
        return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        error = 'No restaurant id in URL'
        callback(error, null);
    }
    else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            map_latlang = restaurant.latlng;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            callback(null, restaurant)
        });
    }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const favoriteIcon = document.createElement('span');
    favoriteIcon.className = 'restaurant-fav';
    favoriteIcon.setAttribute('role', 'button');
    favoriteIcon.setAttribute('aria-label', 'Favorite restaurant');

    const favoriteIconImg = document.createElement('img');
    if (restaurant.is_favorite === "true") {
        favoriteIconImg.alt = 'Favorited ' + restaurant.name;
        favoriteIconImg.setAttribute("src", './img/ico-fav.png');
        favoriteIconImg.className = 'restaurant-fav-icon fav';
    }
    else {
        favoriteIconImg.alt = 'Non Favorite ' + restaurant.name;
        favoriteIconImg.setAttribute("src", './img/ico-fav-o.png');
        favoriteIconImg.className = 'restaurant-fav-icon fav-not';
    }

    favoriteIconImg.addEventListener('click', () => {
        const src = favoriteIconImg.src;
        if (src.includes('img/ico-fav-o.png')) {
            DBHelper.addRestaurantToFavorites(restaurant.id, true, (err, res) => {
                favoriteIconImg.alt = 'Favorited ' + restaurant.name;
                favoriteIconImg.src = './img/ico-fav.png';
            });
        }
        else {
            DBHelper.addRestaurantToFavorites(restaurant.id, false, (err, res) => {
                favoriteIconImg.alt = 'Non Favorite ' + restaurant.name;
                favoriteIconImg.src = './img/ico-fav-o.png';
            });
        }
    });

    favoriteIcon.append(favoriteIconImg);
    name.prepend(favoriteIcon);


    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');
    image.className = 'restaurant-img'
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.alt = 'Restaurant '.concat(restaurant.name);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    DBHelper.fetchReviewsByRestaurant(getParameterByName('id'), (error, reviews) => {
        self.reviews = reviews;
        if (!reviews) {
            console.error(error);
            return;
        }
        fillReviewsHTML();
    });

};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    let tabindex = 0;
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review, tabindex));
    });
    container.appendChild(ul);

    google_maps_lazyload('AIzaSyDHa6FlTK7lGovXhpiKTRS3YSuQyS-mUxk');
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review, tabindex) => {
    const li = document.createElement('li');
    li.setAttribute('tabindex', tabindex);
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = review.updatedAt ? new Date(review.updatedAt).toDateString() : new Date().toDateString();
    li.appendChild(date);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Save restaurant reviews
 * */

reviewRestaurant = (restaurant = self.restaurant) => {
    let id = restaurant.id;
    let name = document.getElementById("review-name").value;
    let rating = document.getElementById("review-rating").value;
    let message = document.getElementById("review-comment").value;

    if (name !== "" && message !== "") {
        let review = {
            restaurant_id: id,
            name: name,
            rating: rating,
            comments: message,
        };

        fetch(`${DBHelper.DATABASE_URL}/reviews`, {
            method: 'POST',
            body: JSON.stringify(review)
        })
            .then(res => res.json())
            .catch(error => {
                DBHelper.openLocalReviewDatabase().then((db) => {
                    let tx = db.transaction('localReviewDbs', 'readwrite');
                    let store = tx.objectStore('localReviewDbs');
                    store.put(review);
                })
            });

        const ul = document.getElementById('reviews-list');
        let tabindex = 0;
        ul.appendChild(createReviewHTML(review, tabindex));
        document.getElementById("review-name").value = '';
        document.getElementById("review-rating").value = 'none';
        document.getElementById("review-comment").value = '';
    }

    return false;
};
