let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      //console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      //console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  //fetchNeighborhoods();
  //fetchCuisines();
});

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

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
  updateRestaurants();
  DBHelper.nextPending();
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      //console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  const imgURL = DBHelper.imageUrlForRestaurant(restaurant);
  //console.log(imgURL);
  //const imgURLSplit = imgURL.split(".");
  //const img_x2 = imgURL + '.jpg';
  const img_x1 = imgURL + '-300_1x.jpg';
  image.src = img_x1;
  //image.srcset = `${img_x1} 300w, ${img_x2} 800w`;
  image.setAttribute('alt', 'Image of ' + restaurant.name + 'Restaurant');
  li.append(image);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('button');
  more.innerHTML = 'View Details';
  more.tabIndex=1;
  more.onclick= ()=>{location.href= DBHelper.urlForRestaurant(restaurant)};
  //more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  const favContainer = document.createElement('div');
  const favorite = document.createElement('button');
  const icon = document.createElement('i');
  icon.className = 'material-icons';
  favContainer.className = 'favContainer';

  let isFavorite= restaurant.is_favorite;
  console.log(restaurant.id,isFavorite);
  if (isFavorite){
    icon.innerHTML = 'favorite';
    favorite.setAttribute('arial-label', restaurant.name + ' is a favorite');
  } else {
    icon.innerHTML = 'favorite_border';
    favorite.setAttribute('arial-label', restaurant.name + ' is not a favorite');
    isFavorite = false
  }
  favorite.id = 'favorite_'+ restaurant.id;
  icon.id = 'favorite_icon_'+ restaurant.id;
  favorite.name = 'Button favorite_'+ restaurant.id;
  favorite.onclick = event => handleFavorites(restaurant.id, !isFavorite);
  favContainer.append(favorite);
  favorite.append(icon);
  li.append(favContainer);


  return li
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}


const handleFavorites = (id, newFavState) =>{
  //Update Restaurant property
  const currentRestaurant = self.restaurants.filter(restaurant => restaurant.id ===id)[0];
  currentRestaurant.is_favorite = newFavState;
  const favorite = document.getElementById('favorite_'+id);
  const icon = document.getElementById('favorite_icon_'+ currentRestaurant.id);
  if (newFavState){
    icon.innerHTML = 'favorite';
    favorite.setAttribute('arial-label', currentRestaurant.name + ' is a favorite');
  } else {
    icon.innerHTML = 'favorite_border';
    favorite.setAttribute('arial-label', currentRestaurant.name + ' is not a favorite');

  }
  favorite.onclick = event => handleFavorites(currentRestaurant.id, !currentRestaurant.is_favorite);
  //send to helper to update value
  DBHelper.handleFavorites(id, newFavState);

};
