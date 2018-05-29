let restaurants,
    neighborhoods,
    cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    fetchNeighborhoods();
    fetchCuisines();
    updateRestaurants();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) { // Got an error
            console.error(error);
        }
        else {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        }
    });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) { // Got an error!
            console.error(error);
        }
        else {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        }
    });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false
    });

    addMarkersToMap();
};

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
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        if (error) { // Got an error!
            console.error(error);
        }
        else {
            resetRestaurants(restaurants);
            fillRestaurantsHTML();
        }
    })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    self.markers.forEach(m => m.setMap(null));
    self.markers = [];
    self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    google_maps_lazyload('AIzaSyDHa6FlTK7lGovXhpiKTRS3YSuQyS-mUxk');
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');

    const image = document.createElement('img');
    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.setAttribute('alt', 'restaurant '.concat(restaurant.name));
    li.append(image);

    const name = document.createElement('h2');
    name.innerHTML = restaurant.name;
    li.append(name);

    const favoriteIcon = document.createElement('span');
    favoriteIcon.className = 'restaurant-fav';
    favoriteIcon.setAttribute('role', 'button');
    favoriteIcon.setAttribute('aria-label', 'Favorite restaurant');

    const favoriteIconImg = document.createElement('img');
    if (restaurant.is_favorite === 'true') {
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

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);
    more.setAttribute('role', 'button');
    more.setAttribute('aria-label', 'View more details about restaurant '.concat(restaurant.name));
    li.append(more);

    return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url
        });
        self.markers.push(marker);
    });


}
