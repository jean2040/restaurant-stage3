let cacheName = 'restaurant_reviews';

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
                       '/css/styles.css',
                       '/data/restaurants.json',
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

    if (event.request.url.indexOf('restaurant.html') > -1){
        const cacheURL = 'restaurant.html';
        cacheRequest = new Request(cacheURL);
    }
    if (cacheUrlObj.hostname !== "localhost"){
        event.request.mode = "no-cors";
    }

    //console.log(`Fetching: ${event.request.url}`);
    event.respondWith(
        caches.match(cacheRequest)
            .then(response=>{
                return response || fetch(event.request)
                    .then(fetchResponse =>{
                        return caches.open(cacheName).then(cache =>{
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse
                        });
                    })

            })
    );
});
