const API_DOMAIN_AVAILABLE = ['api-geo-fr', 'api-geo-ny'];
const API_DOMAIN = API_DOMAIN_AVAILABLE[Math.floor(Math.random() * API_DOMAIN_AVAILABLE.length)];
const WaitingTimesAPI = {
  fallbackGeocodeAPI: 'https://nominatim.openstreetmap.org/search.php?q=%s&format=json',
  geocodeAPI: 'https://api-geo.thejoin.tech/geocode?lat=%s&lng=%s',
  geocodeAPIClient: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&featureTypes=&location=%s,%s',
  // geocodeAPI: 'https://geocode.xyz/%s,%s?json=1',
  logAPI: 'https://api-geo.thejoin.tech/logger',
  getPlaceByNameAPI: 'https://api-geo.thejoin.tech/places/get-by-name?q=%s&address=%s',
  // getPlacesAPI: 'https://api-geo-fr.thejoin.tech/places/explore?q=%s&address=%s&lat=%s&lng=%s',
  getPlacesAPI: 'https://'+API_DOMAIN+'.thejoin.tech/places/explore?q=%s&address=%s',
  getPlacesAPIFallback: 'https://api-geo-fr.thejoin.tech/places/explore-redis?q=%s&address=%s',
  searchSuggestAPI: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=%s&maxSuggestions=10&category=city,address&countryCode=&searchExtent=&location=&distance=&f=json',
  format: function(str) {
    var args = [].slice.call(arguments, 1),
      i = 0;

    return str.replace(/%s/g, () => args[i++]);
  }
};

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
}

Number.prototype.toDeg = function() {
  return this * 180 / Math.PI;
}

// Lat, Lng, Angle, Range in Km => get point of destination
// usage: destinationPoint(43.81, 11.13, 90, 10)
const Utils = {
  updateTimeout: null,
  geoErrorTimeout: null,
  geoErrorFailOverCount: 0,
  sendError: function(requestBody) {
    requestBody["ua"] = navigator.userAgent;
    requestBody["date"] = (new Date()).toString();

    fetch(WaitingTimesAPI.logAPI, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  },
  searchSuggest: async function(el) {
    if (el.value.length > 3) {
      var fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.searchSuggestAPI, el.value);
      var r = await fetch(fetchUrl);
      if (r.ok) {
        var json = await r.json();
        var addresses = [];
        if (json["suggestions"].length > 0) {
          for (let i in json["suggestions"]) {
            addresses.push(json["suggestions"][i]["text"]);
          }
          // render addresses
        }
      }
    }
  },
  setDefaultLocation: function(address, lat, lng) {
    var obj = {
      "address": address,
      "latt": lat,
      "longt": lng
    };
    localStorage.setItem("defaultLocation", JSON.stringify(obj));
  },
  getDefaultLocation: function() {
    return JSON.parse(localStorage.getItem("defaultLocation"));
  },
  searchByNameModal: function() {
    document.body.removeChild(document.querySelector('.modal'));
    Utils.openModal(
      "search-modal",
      "Search by name and address",
      '<input type="text" placeholder="Insert market or place name" id="place"><input type="text" placeholder="Insert address or city" id="address">',
      "Search",
      function searchByName() {
        TimesApp.getPlace(
          document.getElementById('place').value,
          document.getElementById('address').value
        );
        document.body.removeChild(document.querySelector('.modal'));
      }
    );
  },
  openModal: function(id, title, content, actionText, actionFn, closeFn) {
    var id = id || (new Date()).getTime();
    var h2 = title;
    var actionText = actionText || 'Send';

    var divModal = document.createElement('div');
    divModal.id = id;
    divModal.className = 'modal';

    var innerdivModalm = document.createElement('div');
    innerdivModalm.className = 'modal-content animate-opacity card-4';
    divModal.appendChild(innerdivModalm);

    var headerModal = document.createElement('header');
    headerModal.className = 'container teal';
    innerdivModalm.appendChild(headerModal);

    var containerContentDiv = document.createElement('div');
    containerContentDiv.className = 'container';
    innerdivModalm.appendChild(containerContentDiv);

    containerContentDiv.innerHTML = content || '<p>Did not find what you were looking for? <br/><u style="cursor: pointer" onclick="Utils.searchByNameModal()">Tap here to search by name 🔍</u></p><input type="text" id="email" placeholder="Insert an email for an answer or leave blank" /><textarea placeholder="Write here your question or tips" rows="7"></textarea><small><i>Note: this is not a search box</i></small>';

    var buttonM = document.createElement("span");
    buttonM.className = 'close-button display-topright';
    buttonM.setAttribute("onclick", "document.getElementById('" + id + "').style.display='none'");
    buttonM.innerHTML = "&times;";
    headerModal.appendChild(buttonM);

    var headerM = document.createElement("H2");
    headerM.innerHTML = h2;
    headerModal.appendChild(headerM);

    var footer = document.createElement('footer');
    footer.className = 'container teal';
    innerdivModalm.appendChild(footer);

    var closeButton = document.createElement("span");
    closeButton.className = 'btn';
    if (actionText !== -1)
      closeButton.style.float = "right";

    if (closeFn === undefined) {
      closeButton.setAttribute("onclick", "document.getElementById('" + id + "').style.display='none'");
    } else {
      closeButton.addEventListener('click', closeFn);
    }

    closeButton.innerHTML = "Close";
    footer.appendChild(closeButton);

    if (actionText !== -1) {
      var actionButton = document.createElement("span");
      actionButton.className = 'btn';
      if (actionFn === undefined) {
        actionButton.setAttribute("onclick", "TimesApp.sendHelp(document.querySelector('.modal-content textarea').value, document.querySelector('.modal-content #email').value)");
      } else {
        actionButton.addEventListener('click', actionFn);
      }

      actionButton.innerHTML = actionText;
      footer.appendChild(actionButton);
    }

    divModal.style.display = "block";

    document.getElementsByTagName('body')[0].appendChild(divModal);
  },
  getAccurateCurrentPosition: function(geolocationSuccess, geolocationError, geoprogress, options) {
    var lastCheckedPosition,
      locationEventCount = 0,
      watchID,
      timerID;

    options = options || {};

    var checkLocation = function(position) {
      lastCheckedPosition = position;
      locationEventCount = locationEventCount + 1;
      // We ignore the first event unless it's the only one received because some devices seem to send a cached
      // location even when maxaimumAge is set to zero
      if ((position.coords.accuracy <= options.desiredAccuracy) && (locationEventCount > 1)) {
        clearTimeout(timerID);
        navigator.geolocation.clearWatch(watchID);
        foundPosition(position);
      } else {
        geoprogress(position);
      }
    };

    var stopTrying = function() {
      navigator.geolocation.clearWatch(watchID);
      foundPosition(lastCheckedPosition);
    };

    var onError = function(error) {
      clearTimeout(timerID);
      navigator.geolocation.clearWatch(watchID);
      geolocationError(error);
    };

    var foundPosition = function(position) {
      geolocationSuccess(position);
    };

    if (!options.maxWait) options.maxWait = 10000; // Default 10 seconds
    if (!options.desiredAccuracy) options.desiredAccuracy = 20; // Default 20 meters
    if (!options.timeout) options.timeout = options.maxWait; // Default to maxWait

    options.maximumAge = 0; // Force current locations only
    options.enableHighAccuracy = true; // Force high accuracy (otherwise, why are you using this function?)

    watchID = navigator.geolocation.watchPosition(checkLocation, onError, options);
    timerID = setTimeout(stopTrying, options.maxWait); // Set a timeout that will abandon the location loop
  },
  destinationPoint: function(lat, lng, brng, dist) {
    dist = dist / 6371;
    brng = brng.toRad();

    var lat1 = lat.toRad(),
      lon1 = lng.toRad();

    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) +
      Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));

    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) *
      Math.cos(lat1),
      Math.cos(dist) - Math.sin(lat1) *
      Math.sin(lat2));

    if (isNaN(lat2) || isNaN(lon2)) return null;

    return [lat2.toDeg(), lon2.toDeg()];
  },
  distanceLatLng: function(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad();
    var lat1 = (lat1).toRad();
    var lat2 = (lat2).toRad();

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  }
};

const TimesApp = {
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

    TimesApp.lMap.zoomControl.remove()

    TimesApp.myPosition = L.circle([TimesApp.lat, TimesApp.lng], {
      color: '#0696c1',
      fillColor: '#06aee0',
      fillOpacity: 0.5,
      radius: 50
    }).bindPopup("Your position").addTo(TimesApp.lMap);

    TimesApp.lMap.on("moveend", async function() {
      clearTimeout(Utils.updateTimeout);
      let center = TimesApp.lMap.getCenter();
      console.log("new center ", center.toString());

      if (Utils.distanceLatLng(TimesApp.lat, TimesApp.lng, center.lat, center.lng) >= 3) {
        TimesApp.lat = parseFloat(center.lat);
        TimesApp.lng = parseFloat(center.lng);
        Utils.updateTimeout = setTimeout(async function() {
          await TimesApp.updateAddress(-1);
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
      position: 'bottomright'
    });

    legend.onAdd = function(map) {

      var div = L.DomUtil.create('div', 'info legend'),
        grades = [5, 10, 15, 25, 30, 45, 60],
        labels = [],
        from, to;

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


    var meanIntersectPop = 0;

    const diffPopTimes = (popTimes - cPopularity);
    var increase = (popTimes > 0) ? meanTimeSpent : 0;
    if (cPopularity !== 0 && waitTimes > 0) {
      if ((popTimes / cPopularity) <= 2.95) {
        if (diffPopTimes <= 0) {
          increase = maxTimeSpent + (Math.ceil((cPopularity / 2) / 5) * 5);
        } else if (diffPopTimes > 0 && diffPopTimes < (popTimes / 5)) {
          increase = meanTimeSpent;
        } else if (diffPopTimes >= (popTimes / 5) && diffPopTimes <= (popTimes / 2.9)) {
          increase = minTimeSpent;
        } else if (diffPopTimes > (popTimes / 2.9)) {
          increase = 0;
          waitTimes = (Math.ceil((waitTimes * 20 / 100) / 5) * 5);
        }
      } else {
        if (cPopularity >= (popTimes / 2.9)) {
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
    const fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlaceByNameAPI, q, address);
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
      .catch((r) => Utils.sendError({
        url: fetchUrl,
        singlePlace: true,
        message: r.toString()
      }));
  },
  getPlacesFallback: async function() {
    const fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlacesAPI.replace('api-geo-fr', 'api-geo-uk').replace('api-geo-ny', 'api-geo-uk'), TimesApp.query, TimesApp.address);
    ga('send', 'event', 'Request', 'Places', TimesApp.address);
    fetch(fetchUrl)
      .then((r) => {
        if (r.ok) return r.json();
      })
      .then((places) => TimesApp.setPlaceOnMap(places))
      .catch((r) => Utils.sendError({
        url: fetchUrl,
        message: r.toString()
      }));
  },
  getPlaces: function(query, useFallback) {
    var query = query || TimesApp.query;
    var useFallback = useFallback || false;
    TimesApp.setLoading(true);
    // const fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlacesAPI, query, TimesApp.address, TimesApp.lat, TimesApp.lng);
    if (useFallback) {
      var headers = new Headers();
      headers.append('x-geo-lat', TimesApp.lat);
      headers.append('x-geo-lng', TimesApp.lng);
      const fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlacesAPIFallback, query, TimesApp.address);
      ga('send', 'event', 'Request', 'Places', TimesApp.address);
      fetch(fetchUrl, {
          headers: headers
        })
        .then((r) => {
          if (r.ok) return r.json();
        })
        .then((places) => TimesApp.setPlaceOnMap(places))
        .catch((r) => TimesApp.getPlacesFallback());
    } else {
      var placeUrl = WaitingTimesAPI.getPlacesAPI;
      // if (Math.floor(Math.random() * 21) == 10)
      //   placeUrl = placeUrl.replace('api-geo-fr', 'api-geo-uk');

      const fetchUrl = WaitingTimesAPI.format(placeUrl, query, TimesApp.address);
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

      var icon = (typeof(waitTime) === 'string' && colors[0] != '7') ? TimesApp.icons[8] : TimesApp.icons[colors[0]];

      const pointMarker = L.marker([places[key]["coordinates"]["lat"], places[key]["coordinates"]["lng"]], {
        icon: icon
      });

      pointMarker.bindPopup(message);
      pointMarker.addTo(TimesApp.lMap);
      pointMarkers.push(pointMarker);

      TimesApp.place_ids.push(places[key]["place_id"]);
    }
    return pointMarkers;
  },
  updateAddressAwait: async function(initMap) {
    initMap = initMap || true;
    var r = await fetch(WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng));
    r = (r.ok) ? await r.json() : {
      staddress: '',
      city: ''
    };
    r.staddress = (typeof(r.staddress) === 'object' || r.staddress === undefined) ? '' : r.staddress;
    r.city = (typeof(r.city) === 'object' || r.city === undefined) ? '' : r.city;

    TimesApp.address = (r.staddress !== '') ? r.staddress + ', ' : '';
    TimesApp.address += r.city;
    (initMap === true) ? TimesApp.initMap(): TimesApp.getPlaces();
    ga('send', 'event', 'Request', 'Geocode', WaitingTimesAPI.geocodeAPI);
  },
  updateAddress: async function(initMap) {
    initMap = initMap || true;
    TimesApp.setLoading(true);

    var fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPIClient, TimesApp.lng, TimesApp.lat);
    var keyUrl = 1;
    if (Math.floor(Math.random() * 9) == 5) {
      keyUrl = 0;
      fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng);
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
      Utils.sendError({
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

    ga('send', 'event', 'Request', 'Geocode', ((keyUrl == 0) ? WaitingTimesAPI.geocodeAPI : WaitingTimesAPI.geocodeAPIClient));
  },
  updateBound: async function(originLat, originLng) {
    TimesApp.setLoading(true);
    for (var i = 360; i <= 360; i += 120) {
      let destLatLng = Utils.destinationPoint(originLat, originLng, i, 2.5);
      TimesApp.lat = parseFloat(destLatLng[0]);
      TimesApp.lng = parseFloat(destLatLng[1]);

      await new Promise(resolve => setTimeout(resolve, 3000));
      await TimesApp.updateAddress(-1);
    }
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
    Utils.openModal("help-modal", "Need help? Do you want to ask something?");
  },
  sendReview: function(rate) {
    var rate = rate || '0';
    ga('send', 'event', 'Review', 'Rate', rate);
    Utils.sendError({
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
      Utils.sendError({
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
    var r = await fetch(WaitingTimesAPI.format(WaitingTimesAPI.fallbackGeocodeAPI, address));
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
          Utils.sendError({
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
    clearTimeout(Utils.geoErrorTimeout);
    TimesApp.address = TimesApp.promptAddress();

    if (TimesApp.address === null) {
      Utils.geoErrorFailOverCount += 1;
      // Florence by default
      TimesApp.lat = 43.7740236;
      TimesApp.lng = 11.253233;
      TimesApp.address = "Firenze";

      if (TimesApp.lMap === null)
        TimesApp.initMap();

      // First failover test
      if (Utils.geoErrorFailOverCount < 2) {
        Utils.geoErrorTimeout = setTimeout(function() {
          TimesApp.geoError();
        }, 1000);
      }
    } else {
      TimesApp.address = TimesApp.address.trim();
    }


    if (TimesApp.address != "") {
      ga('send', 'event', 'Geolocation', 'GeoError', TimesApp.address);
      const fetchUrl = "https://geocode.xyz/" + TimesApp.address + "?json=1";

      // var json = Utils.getDefaultLocation();
      // if (json === null) {
      var r = await fetch(fetchUrl);
      var json = await r.json();
      if (!r.ok || (json['error'] !== undefined && json['error']['code'] === '006')) {
        json = await TimesApp.fallbackGeocodeCall(TimesApp.address);
      }

      if (json["error"] !== undefined) {
        setTimeout(function() {
          alert("No results. Check your address/city and try again. Please write the city in english");
          Utils.sendError({
            url: fetchUrl,
            geoError: true,
            message: json["error"]
          });
          TimesApp.search();
        }, 2000);
        return false;
      }
      //Utils.setDefaultLocation(TimesApp.address, json.latt, json.longt);
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
                  Utils.sendError({url: fetchUrl, message: r["error"]});
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
          .catch((r) => Utils.sendError({url: fetchUrl, message: r.toString()}));*/
    }
  },
  toggleSpinner: function() {
    const spinnerEl = document.getElementById('loading');
    let displayProp = 'block';
    if (spinnerEl.style.display == 'block')
      displayProp = 'none';

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

  Utils.sendError(requestBody);
}

document.addEventListener('DOMContentLoaded', function() {
  const mapEl = document.getElementById('full-map');
  mapEl.style.height = window.innerHeight - 50 + 'px';

  TimesApp.toggleSpinner();

  Utils.getAccurateCurrentPosition(
    TimesApp.geoSuccess,
    TimesApp.geoError,
    function(p) {
      console.log(p);
    }, {
      desiredAccuracy: 100,
      maxWait: 8000
    }
  );

  setTimeout(function() {
    document.getElementById('banner').style.display = "none";
  }, 40 * 1000);

  if (localStorage.getItem('sended_review') !== 'yes') {
    setTimeout(function() {
      Utils.openModal('rating-modal', 'Please, take time to rate this project', `
        <h4>Your feedback is very important to understand if the estimates are correct or not. Together we can build something useful!</h4>
        <div class="rate">
          <input type="radio" id="star5" name="rate" value="5">
          <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star5" data-value="5" title="5 stars">5 stars</label>
          <input type="radio" id="star4" name="rate" value="4">
          <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star4" data-value="4" title="4 stars">4 stars</label>
          <input type="radio" id="star3" name="rate" value="3">
          <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star3" data-value="3" title="3 stars">3 stars</label>
          <input type="radio" id="star2" name="rate" value="2">
          <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star2" data-value="2" title="2 stars">2 stars</label>
          <input type="radio" id="star1" name="rate" value="1">
          <label onclick="TimesApp.sendReview(this.getAttribute('data-value'))" for="star1" data-value="1" title="1 star">1 star</label>
        </div>
      `, -1);
    }, 100 * 1000);
  }
});

window.addEventListener('appinstalled', function() {
  ga('send', 'event', 'PWA', 'Installed', 'true');
  Utils.sendError({
    "pwa_installed": true
  });
});


(function(i, s, o, g, r, a, m) {
  i['GoogleAnalyticsObject'] = r;
  i[r] = i[r] || function() {
    (i[r].q = i[r].q || []).push(arguments)
  }, i[r].l = 1 * new Date();
  a = s.createElement(o),
    m = s.getElementsByTagName(o)[0];
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-10999521-2', 'auto');
ga('set', 'anonymizeIp', true);
ga('send', 'pageview');

try {
  navigator.serviceWorker.register('sw.js');
} catch (e) {
  console.log(e);
}