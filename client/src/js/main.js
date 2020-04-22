const API_DOMAIN_AVAILABLE = ['api-geo-fr', 'api-geo-ny'];
const API_DOMAIN = API_DOMAIN_AVAILABLE[Math.floor(Math.random() * API_DOMAIN_AVAILABLE.length)];
const WaitingTimesAPI = {
  fallbackGeocodeAPI: 'https://nominatim.openstreetmap.org/search.php?q=%s&format=json',
  geocodeAPI: 'https://api-geo.thejoin.tech/geocode?lat=%s&lng=%s',
  geocodeAPIClient: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&featureTypes=&location=%s,%s',
  // geocodeAPI: 'https://geocode.xyz/%s,%s?json=1',
  logAPI: 'https://api-geo.thejoin.tech/logger',
  feedbackAPI: "https://api-geo-fr.thejoin.tech/send-feedback",
  getPlaceByNameAPI: 'https://api-geo-ny.thejoin.tech/places/get-by-name?q=%s&address=%s',
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
  suggestTimeout: null,
  geoErrorFailOverCount: 0,
  sendFeedback: function (body) {
    fetch(WaitingTimesAPI.feedbackAPI, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  },
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
  searchSuggest: function(el) {
    clearTimeout(Utils.suggestTimeout);
    if (el.value.length >= 2) {
      Utils.suggestTimeout = setTimeout(async function () {
        var fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.searchSuggestAPI, el.value);
        var r = await fetch(fetchUrl);
        var parentEl = document.getElementById('suggest-results');
        parentEl.innerHTML = "";
        var noResult = true;

        if (r.ok) {
          var json = await r.json();
          var addresses = [];
          if (json["suggestions"].length > 0) {
            noResult = false;
            for (let i in json["suggestions"]) {
              var text = json["suggestions"][i]["text"].slice(0, -5);
              var resultElement = document.createElement("div");
              resultElement.className = "item-suggest-result";
              resultElement.setAttribute('onclick', "document.getElementById('suggest-input').value = '" + text +"'; document.querySelector('#suggest-modal .container.teal .btn:nth-of-type(2)').click();");
              resultElement.innerHTML = text;
              parentEl.appendChild(resultElement);
            }
          }
        }

        if (noResult)
          parentEl.innerHTML = '<div class="item-suggest-result">No results</div>';
      }, 400);
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
  shouldShowWelcomeModal: function () {
    var hasSeenWelcomeModal = window.localStorage.getItem("hasSeenWelcomeModal");

    if (hasSeenWelcomeModal) {
      return hasSeenWelcomeModal === 'true' ? false : true;
    }

    return true;
  },
  showWelcomeModal: function () {
    var welcomeModal = document.getElementById('welcome-modal');
    welcomeModal.classList.add('show');
    welcomeModal.focus();

    if (TimesApp.address !== 'Firenze') {
      document.querySelector('.welcome-modal__actions').style.display = "none";
    }
  },
  hideWelcomeModal: function () {
    var welcomeModal = document.getElementById("welcome-modal");
    welcomeModal.classList.remove("show");
    window.localStorage.setItem('hasSeenWelcomeModal', 'true');
    TimesApp.initGeodata();
  },
  showPlaceSidebar: function () {
    var placeSidebar = document.getElementById('places-sidebar');
    placeSidebar.classList.add('show');
    placeSidebar.focus();

    // Reset list
    var sidebarItemContainer = document.querySelector('.sidebar__items')
    sidebarItemContainer.innerHTML = "";

    if (Object.keys(TimesApp.menuPlaces).length > 0) {
      for (let key in TimesApp.menuPlaces) {
        var place = TimesApp.menuPlaces[key]["data"];
        var waitTimeArr = TimesApp.menuPlaces[key]["waitTimeArr"];

        var formattedTime = "recent";
        if (place["updatetime"] !== undefined) {
          var date = new Date(place["updatetime"] * 1000);
          var hours = date.getHours();
          var minutes = "0" + date.getMinutes();
          formattedTime = hours + ':' + minutes.substr(-2);
        }
    
        var waitTime = waitTimeArr[1];
        var isClosed = (waitTimeArr[0] === 0) ? true : false;
        var noInfo = (typeof(waitTime) === 'string' && !isClosed) ? true : false;
        waitTime = (isClosed) ? "Closed" : waitTime;

        var badgeText = (isClosed) ? "Closed" : (waitTime + " min");
        badgeText = (noInfo) ? "No info" : badgeText;

        var itemTitle = document.createElement("h2");
        itemTitle.className = "sidebar__item--title sidebar__item--title--bg-" + waitTime.toString().toLowerCase() + "min";
        itemTitle.innerHTML = place["name"];

        var itemSubtitle = document.createElement("p");
        itemSubtitle.className = "sidebar__item--subtitle";
        itemSubtitle.innerHTML = place["address"];

        var itemBadge = document.createElement("div");
        itemBadge.className = "sidebar__item--badge";

        var badgeBg = document.createElement("div");
        badgeBg.className = "text-center bg-" + waitTime.toString().toLowerCase() + "min";
        badgeBg.innerHTML = "<span>" + badgeText + "</span><br/>Last update <time>" + formattedTime + "</time>";

        itemBadge.appendChild(badgeBg);

        var sidebarItem = document.createElement("div");
        sidebarItem.setAttribute("onclick", "TimesApp.mapMarkers['"+key+"'].fireEvent('click')");
        sidebarItem.className = "sidebar__item";
        sidebarItem.setAttribute("title", place["name"] + " " + place["address"] + " - wait time: " + waitTime + "min");

        sidebarItem.appendChild(itemTitle);
        sidebarItem.appendChild(itemSubtitle);
        sidebarItem.appendChild(itemBadge);

        sidebarItemContainer.appendChild(sidebarItem);
      }
    }
  },
  showPlaceModal: function (place, waitTimeArr) {
    console.log(place);
    var placeModal = document.getElementById('place-modal');
    placeModal.classList.add('show');
    placeModal.focus();
    placeModal.setAttribute("data-place-id", place["place_id"]);

    var formattedTime = "recent";
    if (place["updatetime"] !== undefined) {
      var date = new Date(place["updatetime"] * 1000);
      var hours = date.getHours();
      var minutes = "0" + date.getMinutes();
      formattedTime = hours + ':' + minutes.substr(-2);
    }

    var waitTime = waitTimeArr[1];
    var isClosed = (waitTimeArr[0] === 0) ? true : false;
    var noInfo = (typeof(waitTime) === 'string' && !isClosed) ? true : false;
    waitTime = (isClosed) ? "Closed" : waitTime;

    var modalTitleEl = document.querySelector(".place-modal__title");
    modalTitleEl.innerHTML = place["name"];
    var modalSubtitleEl = document.querySelector(".place-modal__subtitle");
    modalSubtitleEl.innerHTML = place["address"];
    var modalBadgeEl = document.querySelector(".place-modal__badge div");
    var badgeText = (isClosed) ? "Closed" : (waitTime + " min");
    badgeText = (noInfo) ? "No info" : badgeText;
    modalBadgeEl.setAttribute("class", "text-center bg-" + waitTime.toString().toLowerCase() + "min");
    var timeMinEl = document.querySelector("#time-min");
    timeMinEl.innerHTML = badgeText;
    var updateTimeEl = document.querySelector("#place-modal time");
    updateTimeEl.innerHTML = formattedTime;
    var timeRangeEl = document.querySelector("#time-range");
    timeRangeEl.value = waitTimeArr[1];
  },
  hidePlaceModal: function (update) {
    var update = update || false;
    var placeModal = document.getElementById("place-modal");
    placeModal.classList.remove("show");
    if (update) {
      Utils.sendFeedback({
        "place_id": placeModal.getAttribute("data-place-id"),
        "value": {
          "estimate_person": 0,
          "estimate_wait_min": parseInt(document.querySelector("#time-range").value)
        }
      });
    }
  },
  openSuggestModal: function() {
    if (document.querySelector('.modal') !== null)
      document.body.removeChild(document.querySelector('.modal'));
    
    Utils.openModal(
      "suggest-modal",
      "Search by address",
      '<input type="text" autocomplete="off" name="suggest-adr" onkeydown="Utils.searchSuggest(this)" placeholder="Insert your city or address" id="suggest-input"><div id="suggest-results"></div>',
      "Search",
      function searchBySuggest() {
        if (document.getElementById('suggest-input').value == '') {
          alert("Please, specify a place name and a place address.");
          return false;
        }

        TimesApp.address = document.getElementById('suggest-input').value;
        TimesApp.search(-1);
        // suggest-input
        document.body.removeChild(document.querySelector('.modal'));
      }
    );
    document.getElementById('suggest-input').focus();
  },
  searchByNameModal: function() {
    if (document.querySelector('.modal') !== null)
      document.body.removeChild(document.querySelector('.modal'));
    
    Utils.openModal(
      "search-modal",
      "Search by name and address",
      '<input type="text" placeholder="Insert market or place name" id="place"><input type="text" placeholder="Insert address or city" id="address">',
      "Search",
      function searchByName() {
        if (document.getElementById('place').value == '' || document.getElementById('address').value == '') {
          alert("Please, specify a place name and a place address.");
          return false;
        }

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

    var buttonM = document.createElement("button");
    buttonM.setAttribute("type", "button");
    buttonM.className = 'close-button display-topright';
    buttonM.setAttribute("onclick", "document.getElementById('" + id + "').style.display='none'");
    buttonM.innerHTML = "&times;";
    headerModal.appendChild(buttonM);

    var headerM = document.createElement("H2");
    headerM.innerHTML = h2;
    headerModal.appendChild(headerM);

    var footer = document.createElement('div');
    footer.className = 'container teal';
    innerdivModalm.appendChild(footer);

    var closeButton = document.createElement("button");
    closeButton.setAttribute('type', 'button');
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
      var actionButton = document.createElement("button");
      actionButton.setAttribute("type", "button");
      actionButton.className = 'btn';
      if (actionFn === undefined) {
        actionButton.setAttribute("onclick", "TimesApp.sendHelp(document.querySelector('.modal-content textarea').value, document.querySelector('.modal-content #email').value)");
      } else {
        actionButton.addEventListener('click', actionFn);
      }

      actionButton.innerHTML = actionText;
      footer.appendChild(actionButton);
    }

    divModal.style.display = "flex";

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
  toggleLegend: function (e) {
    if (document.getElementById('legend-values').style.display == 'none') {
      document.getElementById('legend-values').style.display = 'block';
      e.innerHTML = 'Legend ▾';
    } else {
      document.getElementById('legend-values').style.display = 'none';
      e.innerHTML = 'Legend ▴';
    }
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
  startBoundIndex: 361,
  mapMarkers: {},
  menuPlaces: {},
  lat: 43.7740236,
  lng: 11.253233,
  address: "Firenze",
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
  initMap: function(getPlaces) {
    var getPlaces = getPlaces || true;
    TimesApp.initIcon();
    TimesApp.lMap = L.map('full-map').setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 11,
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
      clearTimeout(Utils.updateTimeout);
      let center = TimesApp.lMap.getCenter();
      console.log("new center ", center.toString());
      console.log(e.type);
      if (Utils.distanceLatLng(TimesApp.lat, TimesApp.lng, center.lat, center.lng) >= 2.5 || e.type == 'zoomend') {
        TimesApp.lat = parseFloat(center.lat);
        TimesApp.lng = parseFloat(center.lng);
        Utils.updateTimeout = setTimeout(async function() {
          await TimesApp.updateAddress(-1);
          TimesApp.getPlaces(null, true);
          await TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
          TimesApp.getPharmacies();
        }, 1000);
      }

    });

    TimesApp.showLegend();
    if (getPlaces === true)
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

      div.innerHTML = "<span onclick=\"Utils.toggleLegend(this)\">Legend ▴</span><div style=\"display: none\" id=\"legend-values\"><u>Minutes</u>:<br>" + labels.join('<br>') + "</div>";
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
    var waitTime = (Math.ceil((waitTimes + meanIntersectPop) / 5) * 5);

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
        TimesApp.setPlaceOnMap(places);
        if (TimesApp.mapMarkers[places[0]["place_id"]] !== undefined) {
          TimesApp.lMap.setView([places[0]["coordinates"]["lat"], places[0]["coordinates"]["lng"]], TimesApp.zoom);
          TimesApp.mapMarkers[places[0]["place_id"]].fireEvent('click');
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
        .then((places) => {
          TimesApp.startBoundIndex = places.length <= 40 ? 120 : 361;
          TimesApp.setPlaceOnMap(places);
          TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
        })
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
    if (places >= 80) {
      TimesApp.menuPlaces = {};
    }

    for (const key in places) {
      if (places[key]["populartimes"] === undefined) continue;

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
        var formattedTime = hours + ':' + minutes.substr(-2);
        message += " - <i>Last update at</i> " + formattedTime;
      }
      
      var icon = (typeof(waitTime) === 'string' && colors[0] != '7') ? TimesApp.icons[8] : TimesApp.icons[colors[0]];

      const pointMarker = L.marker([places[key]["coordinates"]["lat"], places[key]["coordinates"]["lng"]], {
        icon: icon
      });

      if (TimesApp.place_ids.indexOf(places[key]["place_id"]) !== -1) {
        TimesApp.mapMarkers[places[key]["place_id"]].setIcon(icon);
        TimesApp.mapMarkers[places[key]["place_id"]].removeEventListener("click");
      }

      // pointMarker.bindPopup(message);
      pointMarker.addTo(TimesApp.lMap).on('click', function () {
        Utils.showPlaceModal(places[key], waitTimeArr);
      });
      pointMarkers.push(pointMarker);
      TimesApp.menuPlaces[places[key]["place_id"]] = {data: places[key], waitTimeArr: waitTimeArr};
      TimesApp.mapMarkers[places[key]["place_id"]] = pointMarker;

      TimesApp.place_ids.push(places[key]["place_id"]);
    }
    return pointMarkers;
  },
  updateAddressAwait: async function() {
    var r = await fetch(WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng));
    r = (r.ok) ? await r.json() : {
      staddress: '',
      city: ''
    };
    r.staddress = (typeof(r.staddress) === 'object' || r.staddress === undefined) ? '' : r.staddress;
    r.city = (typeof(r.city) === 'object' || r.city === undefined) ? '' : r.city;

    TimesApp.address = (r.staddress !== '') ? r.staddress + ', ' : '';
    TimesApp.address += r.city;
    TimesApp.getPlaces();
    ga('send', 'event', 'Request', 'Geocode', WaitingTimesAPI.geocodeAPI);
  },
  updateAddress: async function() {
    var fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPIClient, TimesApp.lng, TimesApp.lat);
    var keyUrl = 1;
    if (Math.floor(Math.random() * 15) == 5) {
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
    TimesApp.getPlaces(null, true);

    ga('send', 'event', 'Request', 'Geocode', ((keyUrl == 0) ? WaitingTimesAPI.geocodeAPI : WaitingTimesAPI.geocodeAPIClient));
  },
  updateBound: async function(originLat, originLng) {
    TimesApp.setLoading(true);
    for (var i = 361; i <= 360; i += 120) {
      let destLatLng = Utils.destinationPoint(originLat, originLng, i, 2.5);
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
    TimesApp.toggleSpinner();
    TimesApp.lat = parseFloat(position.coords.latitude);
    TimesApp.lng = parseFloat(position.coords.longitude);
    TimesApp.lMap.setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);

    await TimesApp.updateAddress();
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

    if (message != '' && email != '') {
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
  search: async function(ask) {
    var ask = ask || true;
    if (ask === true)
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
    TimesApp.toggleSpinner();
    Utils.openSuggestModal();
  },
  initGeodata: function () {
    TimesApp.toggleSpinner();
    Utils.getAccurateCurrentPosition(
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
    if (spinnerEl.style.display == 'block')
      displayProp = 'none';

    spinnerEl.style.display = displayProp;
  }
};


// DOMContentLoaded

document.addEventListener('DOMContentLoaded', function () {
  const mapEl = document.getElementById('full-map');
  mapEl.style.height = window.innerHeight + 'px';

  TimesApp.initMap(-1);
  if (Utils.shouldShowWelcomeModal()) {
    Utils.showWelcomeModal();
  } else {
    TimesApp.initGeodata();
  }

  setTimeout(function () {
    document.getElementById('banner').style.display = "none";
  }, 30 * 1000);

  // Auto-refresh
  setTimeout(function () {
    TimesApp.getPlaces(null, true);
  }, 5 * 60 * 1000);

  if (localStorage.getItem('sended_review') !== 'yes') {
    setTimeout(function () {
      Utils.openModal('rating-modal', 'Please, take time to rate this project', `
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
      `, -1);
    }, 120 * 1000);
  }
});

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
