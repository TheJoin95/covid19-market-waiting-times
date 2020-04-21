require("./analytics.js");
const api = require('./api');
const error = require('./error');
const location = require('./location');
const modal = require('./modal');
const utils = require('./utils');
const welcomeModal = require('./welcome-modal');

const FEEDBACK_MODAL_DELAY = 120 * 1000;

// DOMContentLoaded

document.addEventListener('DOMContentLoaded', function () {
  if (welcomeModal.shouldShowWelcomeModal()) {
    welcomeModal.showWelcomeModal();
  }

  TimesApp.initGeodata();

  const mapEl = document.getElementById('full-map');
  mapEl.style.height = window.innerHeight + 'px';

  // setTimeout(function () {
  //   document.getElementById('banner').style.display = "none";
  // }, 30 * 1000);

  if (localStorage.getItem('sended_review') !== 'yes') {
    setTimeout(function () {
      modal.openModal(
        'rating-modal', 
        'Please, take time to rate this project', 
        `
          <h4>Your feedback is very important to understand if the estimates are correct or not. Together we can build something useful!</h4>
          <div class="rate">
            <input type="radio" id="star5" name="rate" value="5">
            <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star5" data-value="5" title="5 stars"><span class='sr-only'>5 stars</span></label>
            <input type="radio" id="star4" name="rate" value="4">
            <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star4" data-value="4" title="4 stars"><span class='sr-only'>4 stars</span></label>
            <input type="radio" id="star3" name="rate" value="3">
            <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star3" data-value="3" title="3 stars"><span class='sr-only'>3 stars</span></label>
            <input type="radio" id="star2" name="rate" value="2">
            <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star2" data-value="2" title="2 stars"><span class='sr-only'>2 stars</span></label>
            <input type="radio" id="star1" name="rate" value="1">
            <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star1" data-value="1" title="1 star"><span class='sr-only'>1 star</span></label>
          </div>
        `, 
        -1
      );
    }, FEEDBACK_MODAL_DELAY);
  }
});

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
}

Number.prototype.toDeg = function() {
  return this * 180 / Math.PI;
}

const TimesApp = {
  startBoundIndex: 361,
  mapMarkers: {},
  lat: null,
  lng: null,
  address: "",
  zoom: 15,
  lMap: null,
  myPosition: null,
  query: "supermarket",
  isLoading: false,
  place_ids: [],
  icons: [],
  fullEstimation: true,
  setLoading: function(b) {
    TimesApp.isLoading = b;
    var display = (b === true) ? 'block' : 'none';
    document.getElementById('top-progress-bar').style.display = display;
  },
  initIcon: function() {
    var assetsPrefix = "/assets/custom-marker/";
    const iconAssets = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];

    for (const key in iconAssets) {
      TimesApp.icons.push(L.icon({
        iconUrl: assetsPrefix + iconAssets[key] + '.png',

        iconSize: [42, 42], // size of the icon
        iconAnchor: [20, 32], // point of the icon which will correspond to marker's location
        popupAnchor: [2, -20] // point from which the popup should open relative to the iconAnchor
      }));
    }
  },
  initMap: function() {
    TimesApp.toggleSpinner();
    TimesApp.initIcon();
    TimesApp.lMap = L.map('full-map').setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 13,
        attribution: 'Map data <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      }
    ).addTo(TimesApp.lMap);

    // TimesApp.lMap.zoomControl.remove();

    TimesApp.myPosition = L.circle([TimesApp.lat, TimesApp.lng], {
      color: '#0696c1',
      fillColor: '#06aee0',
      fillOpacity: 0.5,
      radius: 50
    }).bindPopup("Your position").addTo(TimesApp.lMap);

    TimesApp.lMap.on("moveend zoomend", async function(e) {
      clearTimeout(utils.updateTimeout);
      let center = TimesApp.lMap.getCenter();
      console.log("new center ", center.toString());
      console.log(e.type);
      if (utils.distanceLatLng(TimesApp.lat, TimesApp.lng, center.lat, center.lng) >= 2.5 || e.type == 'zoomend') {
        TimesApp.lat = parseFloat(center.lat);
        TimesApp.lng = parseFloat(center.lng);
        utils.updateTimeout = setTimeout(async function() {
          await TimesApp.updateAddress(-1);
          TimesApp.getPlaces(null, true);
          await TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
          TimesApp.getPharmacies();
        }, 1000);
      }

    });

    TimesApp.showLegend();
    TimesApp.getPlaces(null, true);
  },
  // getMarkerPlaceColor: function (d) {
  //     return d > 60 ? ['#BD0026', '#cc0c33'] :
  //         d > 45  ? ['#800026', '#ff2929'] :
  //         d > 30  ? ['#e33c17', '#fa4c25'] :
  //         d > 25  ? ['#de691b', '#fc7e2a'] :
  //         d > 15   ? ['#e6a910', '#ffbf1c'] :
  //         d > 10   ? ['#d9e30e', '#ecf716'] :
  //                     ['#1dbd00', '#1fcc00'];
  // },
  getMarkerPlaceColor: function(d) {
    return d > 60 ? [6, '#cc0c33'] :
      d > 45 ? [5, '#ff2929'] :
      d > 30 ? [4, '#fa4c25'] :
      d > 25 ? [3, '#fc7e2a'] :
      d > 15 ? [2, '#ffbf1c'] :
      d > 10 ? [1, '#ecf716'] : [0, '#1fcc00'];
  },
  showLegend: function() {
    var legend = L.control({
      position: 'bottomleft'
    });

    legend.onAdd = function(map) {

      var div = L.DomUtil.create('div', 'info legend'),
        grades = [5, 10, 15, 25, 30, 45, 60],
        labels = [],
        from, to;

      labels.push(
        '<i style="background: #3f8ee2"></i> No info'
      );
      
      for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];

        labels.push(
          '<i style="background:' + TimesApp.getMarkerPlaceColor(grades[i] + 1)[1] + '"></i> ' +
          from + (to ? '&ndash;' + to : '+'));
      }

      div.innerHTML = "Minutes:<br>" + labels.join('<br>');
      return div;
    };

    legend.addTo(TimesApp.lMap);
  },
  getWaitTime: function(place) {
    const hour = (new Date()).getHours();
    const weekDay = ((new Date()).getDay() === 0) ? 6 : (new Date()).getDay() - 1;

    var maxTimeSpent = meanTimeSpent = minTimeSpent = 0;

    if (place["time_spent"] !== undefined && place["time_spent"].length > 0) {
      place["time_spent"][0] = (place["time_spent"][0] == 1) ? 60 : place["time_spent"][0];
      place["time_spent"][1] = (place["time_spent"][1] == 1) ? 60 : place["time_spent"][1];
      maxTimeSpent = Math.max(...place["time_spent"]);
      minTimeSpent = Math.min(...place["time_spent"]);
      meanTimeSpent = (place["time_spent"].reduce(function(a, b) {
        return a + b;
      }, 0)) / 2;
    }

    const cPopularity = place["current_popularity"] || 0;

    var waitTimes = popTimes = 0;
    if (place["time_wait"] !== undefined && place["time_wait"].length > 0)
      waitTimes = place["time_wait"][weekDay]["data"][hour];

    popTimes = place["populartimes"][weekDay]["data"][hour];
    if ((new Date()).getMinutes() >= 40 && place["populartimes"][weekDay]["data"][hour+1] !== undefined && place["populartimes"][weekDay]["data"][hour+1] != 0)
      popTimes = Math.floor((popTimes + place["populartimes"][weekDay]["data"][hour+1]) / 2);
    
    var meanIntersectPop = 0;
    const diffPopTimes = (popTimes - cPopularity);
    var increase = (popTimes > 0) ? meanTimeSpent : 0;
    if (cPopularity !== 0) {
      if ((popTimes / cPopularity) <= 3.3) {
        if (diffPopTimes <= 0 && waitTime > 10) {
          increase = maxTimeSpent + (Math.ceil((cPopularity / 2) / 5) * 5);
        } else if (diffPopTimes > 0 && diffPopTimes < (popTimes / 5)) {
          increase = meanTimeSpent;
        } else if (diffPopTimes >= (popTimes / 5) && diffPopTimes <= (popTimes / 2.9)) {
          increase = minTimeSpent;
        } else if (diffPopTimes > (popTimes / 2.9) && diffPopTimes <= (popTimes / 1.8)) {
          increase = (Math.ceil((minTimeSpent / 2) / 5) * 5);
        } else if (diffPopTimes > (popTimes / 1.8) && diffPopTimes <= (popTimes / 1.5)) {
          increase = (Math.ceil((minTimeSpent / 3) / 5) * 5);
        } else if (diffPopTimes > (popTimes / 1.5)) {
          increase = 0;
          waitTimes = (Math.ceil((waitTimes * 20 / 100) / 5) * 5);
        }
      } else {
        if (cPopularity >= (popTimes / 3.3)) {
          increase = minTimeSpent;
        } else {
          waitTimes = 0;
          increase = 5;
        }
      }
    } else if (waitTimes == 0) {
      increase = 0;
    } else if (cPopularity == 0 && TimesApp.fullEstimation == false) {
      waitTime = 0;
      increase = 0;
    }

    meanIntersectPop += increase;

    var waitTime = Math.ceil(waitTimes + meanIntersectPop);

    if (popTimes !== 0 && cPopularity >= 18)
      waitTime += 5; // relative error, white rumor

    if (waitTime === 0 && (meanTimeSpent === 0 || cPopularity === 0))
      waitTime = 'No information about ';

    return [place["populartimes"][weekDay]["data"][hour], waitTime];
  },
  getPharmacies: function() {
    console.log("Getting pharmacy");
    // TimesApp.getPlaces("pharmacy");
  },
  getPlace: function(q, address) {
    TimesApp.setLoading(true);
    const fetchUrl = api.WaitingTimesAPI.format(api.WaitingTimesAPI.getPlaceByNameAPI, q, address);
    ga('send', 'event', 'Request', 'Place', (q + ' ' + address));
    fetch(fetchUrl)
      .then((r) => {
        if (r.ok) return r.json();
      })
      .then((places) => {
        const markers = TimesApp.setPlaceOnMap(places);
        if (markers.length > 0) {
          markers[markers.length - 1].openPopup();
        } else if (places[0]["populartimes"] !== undefined && places[0]["populartimes"] !== null) {
          TimesApp.lMap.setView([places[0]["coordinates"]["lat"], places[0]["coordinates"]["lng"]], TimesApp.zoom);
        } else {
          alert("Unfortunally " + q + " does not have any information about waiting times");
        }
      })
      .catch((r) => error.sendError({
        url: fetchUrl,
        singlePlace: true,
        message: r.toString()
      }));
  },
  getPlacesFallback: async function() {
    const fetchUrl = api.WaitingTimesAPI.format(api.WaitingTimesAPI.getPlacesAPI.replace('api-geo-fr', 'api-geo-uk').replace('api-geo-ny', 'api-geo-uk'), TimesApp.query, TimesApp.address);
    ga('send', 'event', 'Request', 'Places', TimesApp.address);
    fetch(fetchUrl)
      .then((r) => {
        if (r.ok) return r.json();
      })
      .then((places) => TimesApp.setPlaceOnMap(places))
      .catch((r) => error.sendError({
        url: fetchUrl,
        message: r.toString()
      }));
  },
  getPlaces: function(query, useFallback) {
    var query = query || TimesApp.query;
    var useFallback = useFallback || false;
    TimesApp.setLoading(true);
    // const fetchUrl = api.WaitingTimesAPI.format(api.WaitingTimesAPI.getPlacesAPI, query, TimesApp.address, TimesApp.lat, TimesApp.lng);
    if (useFallback) {
      var headers = new Headers();
      headers.append('x-geo-lat', TimesApp.lat);
      headers.append('x-geo-lng', TimesApp.lng);
      const fetchUrl = api.WaitingTimesAPI.format(api.WaitingTimesAPI.getPlacesAPIFallback, query, TimesApp.address);
      ga('send', 'event', 'Request', 'Places', TimesApp.address);
      fetch(fetchUrl, {
          headers: headers
        })
        .then((r) => {
          if (r.ok) return r.json();
        })
        .then((places) => {
          TimesApp.startBoundIndex = places.length <= 40 ? 120 : 361;
          TimesApp.setPlaceOnMap(places);
          TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
        })
        .catch((r) => TimesApp.getPlacesFallback());
    } else {
      var placeUrl = api.WaitingTimesAPI.getPlacesAPI;
      // if (Math.floor(Math.random() * 21) == 10)
      //   placeUrl = placeUrl.replace('api-geo-fr', 'api-geo-uk');

      const fetchUrl = api.WaitingTimesAPI.format(placeUrl, query, TimesApp.address);
      ga('send', 'event', 'Request', 'Places', TimesApp.address);
      fetch(fetchUrl)
        .then((r) => {
          if (r.ok) return r.json();
        })
        .then((places) => TimesApp.setPlaceOnMap(places))
        .catch((r) => TimesApp.getPlacesFallback());
    }

  },
  setPlaceOnMap: function(places) {
    console.log(places);
    TimesApp.setLoading(false);
    var pointMarkers = [];

    for (const key in places) {
      if (places[key]["populartimes"] === undefined || TimesApp.place_ids.indexOf(places[key]["place_id"]) !== -1) continue;

      let waitTimeArr = TimesApp.getWaitTime(places[key]);

      let waitTime = waitTimeArr[1];
      // let radius = waitTime + 80;
      let colors = TimesApp.getMarkerPlaceColor(waitTime);
      let message = "<b>" + places[key]["name"] + "</b><br><small>" + places[key]["address"] + "</small><br/><i>" + waitTime + "min</i> of line";

      // if (isNaN(radius)) radius = 80;

      if (waitTimeArr[0] === 0) {
        colors = ["7", "#777"];
        // radius = 80;
        message = "<i>Closed</i><br/>" + message;
      }
      
      if (places[key]["user_feedback"] !== undefined && places[key]["user_feedback"]["estimate_wait_min"] !== undefined) {
        waitTime = places[key]["user_feedback"]["estimate_wait_min"];
        waitTimeArr[1] = waitTime;
        colors = TimesApp.getMarkerPlaceColor(waitTime);
        places[key]["updatetime"] = places[key]["user_feedback"]["updatetime"];
      }

      if (places[key]["updatetime"] !== undefined) {
        var date = new Date(places[key]["updatetime"] * 1000);
        var hours = date.getHours();
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        var formattedTime = hours + ':' + minutes.substr(-2);
        message += " - <i>Last update at</i> " + formattedTime;
      }
      
      var icon = (typeof(waitTime) === 'string' && colors[0] != '7') ? TimesApp.icons[8] : TimesApp.icons[colors[0]];

      const pointMarker = L.marker([places[key]["coordinates"]["lat"], places[key]["coordinates"]["lng"]], {
        icon: icon
      });

      // pointMarker.bindPopup(message);
      pointMarker.addTo(TimesApp.lMap).on('click', function () {
        utils.showPlaceModal(places[key], waitTimeArr);
      });
      pointMarkers.push(pointMarker);
      TimesApp.mapMarkers[places[key]["place_id"]] = pointMarker;

      TimesApp.place_ids.push(places[key]["place_id"]);
    }
    return pointMarkers;
  },
  updateAddressAwait: async function(initMap) {
    initMap = initMap || true;
    var r = await fetch(api.WaitingTimesAPI.format(api.WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng));
    r = (r.ok) ? await r.json() : {
      staddress: '',
      city: ''
    };
    r.staddress = (typeof(r.staddress) === 'object' || r.staddress === undefined) ? '' : r.staddress;
    r.city = (typeof(r.city) === 'object' || r.city === undefined) ? '' : r.city;

    TimesApp.address = (r.staddress !== '') ? r.staddress + ', ' : '';
    TimesApp.address += r.city;
    (initMap === true) ? TimesApp.initMap(): TimesApp.getPlaces();
    ga('send', 'event', 'Request', 'Geocode', api.WaitingTimesAPI.geocodeAPI);
  },
  updateAddress: async function(initMap) {
    initMap = initMap || true;
    TimesApp.setLoading(true);

    var fetchUrl = api.WaitingTimesAPI.format(api.WaitingTimesAPI.geocodeAPIClient, TimesApp.lng, TimesApp.lat);
    var keyUrl = 1;
    if (Math.floor(Math.random() * 15) == 5) {
      keyUrl = 0;
      fetchUrl = api.WaitingTimesAPI.format(api.WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng);
    }

    var r = await fetch(fetchUrl);
    var json = {
      staddress: '',
      city: ''
    };
    if ((r.ok)) {
      json = await r.json();
    } else {
      let error = await r.json();
      error.sendError({
        url: fetchUrl,
        updateAddress: true,
        message: error.toString()
      });
      return false;
    }

    json.staddress = (typeof(json.staddress) === 'object' || json.staddress === undefined) ? '' : json.staddress;
    json.city = (typeof(json.city) === 'object' || json.city === undefined) ? '' : json.city;

    if (json.staddress === '' && json.address !== undefined)
      json.staddress = (json.address["Address"] === undefined) ? '' : json.address["Address"];

    if (json.city === '' && json.address !== undefined)
      json.city = (json.address["City"] === undefined) ? '' : json.address["City"];

    TimesApp.address = (json.staddress !== '') ? json.staddress + ', ' : '';
    TimesApp.address += json.city;
    (initMap === true) ? TimesApp.initMap(): TimesApp.getPlaces();

    ga('send', 'event', 'Request', 'Geocode', ((keyUrl == 0) ? api.WaitingTimesAPI.geocodeAPI : api.WaitingTimesAPI.geocodeAPIClient));
  },
  updateBound: async function(originLat, originLng) {
    TimesApp.setLoading(true);
    for (var i = 361; i <= 360; i += 120) {
      let destLatLng = utils.destinationPoint(originLat, originLng, i, 2.5);
      TimesApp.lat = parseFloat(destLatLng[0]);
      TimesApp.lng = parseFloat(destLatLng[1]);

      await new Promise(resolve => setTimeout(resolve, 3000));
      await TimesApp.updateAddress(-1);
    }
    TimesApp.setLoading(false);
  },
  geoSuccess: async function(position) {
    if (position === undefined) {
      TimesApp.geoError();
      return false;
    }
    TimesApp.lat = parseFloat(position.coords.latitude);
    TimesApp.lng = parseFloat(position.coords.longitude);

    await TimesApp.updateAddressAwait();
    await TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
    ga('send', 'event', 'Geolocation', 'GeoSuccess', 'true');
  },
  showModalHelp: function() {
    if (document.querySelector('.modal') !== null)
      document.body.removeChild(document.querySelector('.modal'));
    modal.openModal("help-modal", "Need help? Do you want to ask something?");
  },
  sendReview: function(rate) {
    var rate = rate || '0';
    ga('send', 'event', 'Review', 'Rate', rate);
    error.sendError({
      rate: rate
    });
    localStorage.setItem("sended_review", "yes");
    document.querySelector('.modal-content div.container').innerHTML = '<h2>Feedback sent, thank you!</h2>';
    setTimeout(function() {
      document.body.removeChild(document.getElementById('rating-modal'));
    }, 1200);
  },
  sendHelp: function(message, email) {
    var email = email || "";

    if (message != '' || email != '') {
      error.sendError({
        message: message,
        email: email,
        help: true
      });
    }

    document.querySelector('.modal-content div.container').innerHTML = '<h2>Message sent, thank you!</h2>';
    setTimeout(function() {
      document.getElementById('help-modal').style.display = 'none';
    }, 1200);
  },
  fallbackGeocodeCall: async function(address) {
    var r = await fetch(api.WaitingTimesAPI.format(api.WaitingTimesAPI.fallbackGeocodeAPI, address));
    var json = await r.json();

    if (json.length > 0 && json[0]['lat'] !== undefined) {
      json['latt'] = json[0]['lat'];
      json['longt'] = json[0]['lon'];
    } else {
      json["error"] = true;
    }

    return json;
  },
  search: async function() {
    TimesApp.address = prompt("This app need your gps position or at least your address or your city:", "");
    if (TimesApp.address === null)
      return false;

    TimesApp.setLoading(true);
    if (TimesApp.address != "") {
      ga('send', 'event', 'Request', 'Search', TimesApp.address);
      const fetchUrl = "https://geocode.xyz/" + TimesApp.address + "?json=1";

      var r = await fetch(fetchUrl);
      var json = await r.json();
      if (!r.ok || (json['error'] !== undefined && json['error']['code'] === '006')) {
        json = await TimesApp.fallbackGeocodeCall(TimesApp.address);
      }

      if (json["error"] !== undefined) {
        setTimeout(function() {
          alert("No results. Check your address/city and try again. Please write the city in english");
          error.sendError({
            url: fetchUrl,
            search: true,
            message: json["error"]
          });
          TimesApp.search();
        }, 2000);
        return false;
      }

      TimesApp.lat = parseFloat(json.latt);
      TimesApp.lng = parseFloat(json.longt);
      TimesApp.getPlaces(null, true);
      TimesApp.lMap.setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);
      TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
    }
  },
  promptAddress: function() {
    return prompt("This app need your gps position or at least your address or your city:", "");
  },
  geoError: async function(e) {
    clearTimeout(utils.geoErrorTimeout);
    TimesApp.address = TimesApp.promptAddress();

    if (TimesApp.address === null) {
      utils.geoErrorFailOverCount += 1;
      // Florence by default
      TimesApp.lat = 43.7740236;
      TimesApp.lng = 11.253233;
      TimesApp.address = "Firenze";

      if (TimesApp.lMap === null)
        TimesApp.initMap();

      // First failover test
      if (utils.geoErrorFailOverCount < 2) {
        utils.geoErrorTimeout = setTimeout(function() {
          TimesApp.geoError();
        }, 1000);
      }
    } else {
      TimesApp.address = TimesApp.address.trim();
    }


    if (TimesApp.address != "") {
      ga('send', 'event', 'Geolocation', 'GeoError', TimesApp.address);
      const fetchUrl = "https://geocode.xyz/" + TimesApp.address + "?json=1";

      // var json = utils.getDefaultLocation();
      // if (json === null) {
      var r = await fetch(fetchUrl);
      var json = await r.json();
      if (!r.ok || (json['error'] !== undefined && json['error']['code'] === '006')) {
        json = await TimesApp.fallbackGeocodeCall(TimesApp.address);
      }

      if (json["error"] !== undefined) {
        setTimeout(function() {
          alert("No results. Check your address/city and try again. Please write the city in english");
          error.sendError({
            url: fetchUrl,
            geoError: true,
            message: json["error"]
          });
          TimesApp.geoError();
        }, 2000);
        return false;
      }
      //utils.setDefaultLocation(TimesApp.address, json.latt, json.longt);
      // }

      TimesApp.lat = parseFloat(json.latt);
      TimesApp.lng = parseFloat(json.longt);
      if (TimesApp.lMap === null) {
        TimesApp.initMap();
        TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
      } else {
        TimesApp.getPlaces(null, false);
        TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
      }

      /*fetch(fetchUrl)
          .then(async (r) => {
              var json = await r.json();
              if (json['error'] !== undefined && json['error']['code'] === '006') {
                  json = await TimesApp.fallbackGeocodeCall(TimesApp.address);
              }

              return json;
          })
          .then((r) => {
              if (r["error"] !== undefined) {
                setTimeout(function () {
                  alert("No results. Check your address/city and try again. Please write the city in english");
                  error.sendError({url: fetchUrl, message: r["error"]});
                  TimesApp.geoError();
                }, 2000);
                return false;
              }

              TimesApp.lat = parseFloat(r.latt);
              TimesApp.lng = parseFloat(r.longt);
              if (TimesApp.lMap === null) {
                TimesApp.initMap();
                TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
              } else {
                TimesApp.getPlaces();
                TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
              }
          })
          .catch((r) => error.sendError({url: fetchUrl, message: r.toString()}));*/
    }
  },
  initGeodata: function () {
    TimesApp.toggleSpinner();
    location.getAccurateCurrentPosition(
      TimesApp.geoSuccess,
      TimesApp.geoError,
      function (p) {
        console.log(p);
      }, {
        desiredAccuracy: 100,
        maxWait: 8000
      }
    );
  },
  toggleSpinner: function() {
    const spinnerEl = document.getElementById('loading');
    let displayProp = 'block';

    spinnerEl.focus();

    if (spinnerEl.style.display === 'block') {
      displayProp = 'none';
    }

    spinnerEl.style.display = displayProp;
  }
};

window.onerror = function(errorMessage, errorUrl, errorLine) {
  const requestBody = {
    date: (new Date()).toString(),
    ua: navigator.userAgent,
    errorMessage: errorMessage,
    errorUrl: errorUrl,
    errorLine: errorLine
  };

  error.sendError(requestBody);
}

// PWA

require('./pwa');

// ServiceWorker

try {
  navigator.serviceWorker.register('sw.js');
} catch (e) {
  console.log(e);
}

// Place on the window object until
// we can extract it to separate file
window.TimesApp = TimesApp;
