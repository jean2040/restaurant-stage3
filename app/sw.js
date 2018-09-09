import idb from 'idb';

let cacheName = 'restaurant_reviews-001';

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

//Install site assets
self.addEventListener('install', function(event){
   event.waitUntil(
       caches.open(cacheName)
           .then(cache=>{
               return cache
                   .addAll([
                       '/',
                       '/index.html',
                       '/restaurant.html',
                       '/styles/styles.css',
                        '/styles/reviews.css',
                        '/styles/baseStyles.css',
                        '/scripts/dbhelper.js',
                       '/scripts/main.js',
                       '/scripts/restaurant_info.js',
                       '/scripts/register_sw.js',
                      'images/no-image.png'
            ])
                   .catch(error => {
                       console.log("Caches open failed " + error)
                   })
           }));
});
//Intercept Web Page requests
self.addEventListener('fetch', event=>{
    let cacheRequest = event.request;
    let cacheUrlObj = new URL(event.request.url);
    //Check If index is less than zero, then request main restaurant page
    if (event.request.url.indexOf('restaurant.html') > -1){
        const cacheURL = 'restaurant.html';
        cacheRequest = new Request(cacheURL);
    }
    /*
  if (cacheUrlObj.hostname !== "localhost") {
    event.request.mode = "no-cors";
  }
  */
    //check if the Request is going to the API server
    const checkURL = new URL(event.request.url);
    //console.log('Request coming from:' + checkURL.port)
    if(checkURL.port === '1337'){

      const urlParts = checkURL.pathname.split('/');
      //After Split, check if the last piece of the split path is restaurants
      let id = checkURL.searchParams.get('restaurant_id')-0;
      if (!id){
        if (checkURL.pathname.indexOf('restaurants')){
          id = urlParts[urlParts.length -1] === 'restaurants'? '-1' : urlParts[urlParts.length -1];
        } else {
          id = checkURL.searchParams.get('restaurants_id');
        }
      }

      handleAJAXEvent(event, id);
      //console.log('AJAX event with '+ id);
    }else{
      handleNonAJAXEvent(event, cacheRequest);
      //console.log('none AJAX event');
    }
    //console.log(`Fetching: ${event.request.url}`);


});

const handleAJAXEvent = (event, id) =>{
  //Here the magic Happens...
  //check if the data is in index db and retrieve it,
  //if not, get it from API, store it and return it
  if (event.request.method !== "GET") {
    return fetch(event.request)
      .then(response => response.json())
      .then(jsonData => {
        return jsonData
      });
  }

  // Split these request for handling restaurants vs reviews
  if (event.request.url.indexOf("reviews") > -1) {
    //push reviews to the reviews IndexDB
    handleReviewsEvent(event, id);
  } else {
    //push restaurants to the reviews IndexDB
    handleRestaurantEvent(event, id);
  }
};

const handleNonAJAXEvent = (event, cacheRequest) => {
  event.respondWith(
    caches.match(cacheRequest)
      .then(response=>{
        return response || fetch(event.request)
          .then(fetchResponse =>{
            return caches.open(cacheName)
              .then(cache =>{
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse
              });
          }).catch(error => {
            if (event.request.url.indexOf(".jpg")>-1){
              return caches.match('/images/no-image.png')
            }
            return new Response("Not connected ot the Internet", error)
          })
      }));
};

const handleReviewsEvent = (event, id) => {
  event.respondWith(dbPromise.then(db => {
    return db
      .transaction("reviews")
      .objectStore("reviews")
      .index("restaurant_id")
      .getAll(id);
  }).then(data => {
    return (data.length && data) || fetch(event.request)
      .then(fetchResponse => fetchResponse.json())
      .then(data => {
        return dbPromise.then(idb => {
          const itx = idb.transaction("reviews", "readwrite");
          const store = itx.objectStore("reviews");
          data.forEach(review => {
            store.put({id: review.id, "restaurant_id": review["restaurant_id"], data: review});
          })
          return data;
        })
      })
  }).then(finalResponse => {
    if (finalResponse[0].data) {
      // Need to transform the data to the proper format
      const mapResponse = finalResponse.map(review => review.data);
      return new Response(JSON.stringify(mapResponse));
    }
    return new Response(JSON.stringify(finalResponse));
  }).catch(error => {
    return new Response("Error fetching data", error)
  }))
};

const handleRestaurantEvent = (event, id)=>{
  event.respondWith(
    dbPromise.then(db => {
      return db.transaction('restaurants')
        .objectStore('restaurants')
        .get(id);
    })
      .then(data =>{
        return(
          //return data if it is there, if not, the fetch the data
          (data && data.data) || fetch(event.request)
            .then(fetchAPI => fetchAPI.json())
            .then(jsonData=>{
              return dbPromise.then(db=>{
                const tx = db.transaction('restaurants', 'readwrite');
                tx.objectStore('restaurants').put({
                  id: id,
                  data: jsonData
                });
                return jsonData;
              });
            })
        )
      }).then(finalResponse =>{
      //console.log(finalResponse);
      return new Response(JSON.stringify(finalResponse))
    })
      .catch(error => {
        return new Response("Error while fetching Data", error);
      })
  )
}





