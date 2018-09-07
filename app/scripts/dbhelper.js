
/**
 * Common database helper functions.
 */
import idb from "idb";

const dbPromise = idb.open('restaurant_reviews',3,upgradeDB =>{
  switch(upgradeDB.oldVersion){
    case 0:
      upgradeDB.createObjectStore("restaurants", {keyPath: "id"});
    case 1:
    {
      const reviewsStore = upgradeDB.createObjectStore("reviews", {keyPath: "id"});
      reviewsStore.createIndex("restaurant_id", "restaurant_id");
    }
    case 2:
      upgradeDB.createObjectStore("pending", {
        keyPath: "id",
        autoIncrement: true
      });
  }
});

class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id) {
     let fetchURL;
    if (!id){
      fetchURL = DBHelper.DATABASE_URL
    }else{
      fetchURL = DBHelper.DATABASE_URL + '/' + id;
      }
      console.log(fetchURL);
    fetch(fetchURL, {
      method: 'get'
    })
        .then(response => {
          response.json()
              .then(restaurants => {
                //console.log('restaurants JSON', restaurants);
                callback(null, restaurants);
              });
        })
        .catch(error => {
          callback(`Request failed. Returned ${error}`, null)
        })
  }

  static fetchReviews(callback, id){
    let revURL = 'http://localhost:1337/reviews/?restaurant_id='+ id;
    fetch(revURL,{
      method: 'GET'
    })
    .then(res=>{
      res.json()
      .then(reviews => {
        console.log(reviews);
        callback(null, reviews);
      });
    }).catch(error => {
      callback(error, null);
    })


  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  static fetchReviewById(id, callback){
    DBHelper.fetchReviews(
      (error, reviews) => {
        if(error){
          callback(error, null);
        }else{
          const res_reviews = reviews.filter(r => r.restaurant_id == id);
          if(res_reviews){
              callback(null,res_reviews);
          }else{
            callback('No Reviews for this restaurant', null);
          }
        }
      },id);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
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
      } else {
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
      } else {
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
      } else {
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
      } else {
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
    return (`/images/${restaurant.photograph}`);
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
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  static updateCachedReviews(data){
    console.log('Updating cache');
    dbPromise.then(db=>{
      const tx = db.transaction('reviews', "readwrite");
      const store = tx.objectStore('reviews');
      store.put({
        id: Date.now(),
        'restaurant_id': data.id,
        data: data
      });
      console.log('reviews is in the store')
      return tx.complete
    })
  }

  static addPendingReviews(url, method, data){
    const dbPromise = idb.open('restaurant_reviews');
    dbPromise.then(db =>{
      const tx = db.transaction('pending', 'readwrite');
      tx.objectStore('pending')
        .put({
          data:{
            url,
            method,
            data
          }
        })
    })
      .catch(error => {})
      .then(DBHelper.nextPending());
  }

  static nextPending(){
    DBHelper.addPendingPost(DBHelper.nextPending)

  }

  static addPendingPost(callback){
    let url , method, data ;
    dbPromise.then(db=>{
      if (!db.objectStoreNames.length){
        console.log('no DB avaiable');
        db.close();
        return
      }

      const tx = db.transaction('pending', 'readwrite');
      tx.objectStore('pending')
        .openCursor()
        .then(cursor =>{
          //if it is empty, stop
          if (!cursor){
            return;
          }
          const value = cursor.value;
          url = cursor.value.data.url;
          method = cursor.value.data.method;
          data = cursor.value.data.data

          if ((!url || !method) || (method ==='post' && !data)){
            cursor.delete()
              .then(callback());
            return;
          } ;
          //Properties to be reused on fetch
          const properties = {
            body: JSON.stringify(data),
            method: method
          }
          console.log('Sending Post', properties);
          fetch(url,properties)
            .then(res => {
              //ifresponse is not good. we are offline
              if (!res.ok && !res.redirected){
                return;
              }
            })
            .then(()=>{
              //If it gets here, then it was a succes and we need to delete the pending item
              const deltx = db.transaction('pending', 'readwrite');
              deltx.objectStore('pending')
                .openCursor()
                .then(cursor=>{
                  cursor.delete()
                    .then(()=>{
                      callback();
                    })
                })
              console.log('pending item has been deleted')
            })

        })
        .catch(error => {
          console.log("error in the cursor");
          return;
        })
    })
  }

  static postNewReview(data, callback){
    const url = 'http://localhost:1337/reviews';
    const method = 'post';
    DBHelper.updateCachedReviews(data);
    DBHelper.addPendingReviews(url,method, data);
    callback(null, null);
  }

  static postReview(data, callback){
    DBHelper.postNewReview(data,(error, result)=>{
      if (error){
        callback(error,null);
        return;
      }else {
        callback(null, result)
      }
    });
  }


}
window.DBHelper = DBHelper;
