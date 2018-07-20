import idb from 'idb';

let cacheName = 'restaurant_reviews-001';

const dbPromise = idb.open('restaurant_reviews',1,upgradeDB =>{
  switch(upgradeDB.oldVersion){
    case 0:
      //Create and Store to the a IndexDB
      upgradeDB.createObjectStore('restaurants',{keyPath:'id'});
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
                       //'/data/restaurants.json',
                       'images/1.jpg',
                       'images/2.jpg',
                       'images/3.jpg',
                       'images/4.jpg',
                       'images/5.jpg',
                       'images/6.jpg',
                       'images/7.jpg',
                       'images/8.jpg',
                       'images/9.jpg',
                       'images/10.jpg',
                       '/scripts/dbhelper.js',
                       '/scripts/main.js',
                       '/scripts/restaurant_info.js',
                       '/scripts/register_sw.js',

            ])
                   .catch(error => {
                       console.log("Caches open failed " + error)
                   })
           })

   );
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
      console.log('AJAX event with '+ id);
    }else{
      handleNonAJAXEvent(event, cacheRequest);
      console.log('none AJAX event');
    }
    //console.log(`Fetching: ${event.request.url}`);


});

const handleAJAXEvent = (event, id) =>{
  //Here the magic Happens...
  //check if the data is in index db and retrieve it,
  //if not, get it from API, store it and return it
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
        console.log(finalResponse);
      return new Response(JSON.stringify(finalResponse))
        })
      .catch(e => {
        return new Response("Error while fetching Data", {status: 500});
      })
  )
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
          })

      })
  );
};

