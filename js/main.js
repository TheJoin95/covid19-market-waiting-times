"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(n); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var API_DOMAIN_AVAILABLE = ['api-geo-fr', 'api-geo-ny'];
var API_DOMAIN = API_DOMAIN_AVAILABLE[Math.floor(Math.random() * API_DOMAIN_AVAILABLE.length)];
var WaitingTimesAPI = {
  fallbackGeocodeAPI: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?Address=%s&f=json',
  geocodeAPI: 'https://api-geo.thejoin.tech/geocode?lat=%s&lng=%s',
  geocodeAPIClient: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&featureTypes=&location=%s,%s',
  // geocodeAPI: 'https://geocode.xyz/%s,%s?json=1',
  logAPI: 'https://api-geo.thejoin.tech/logger',
  feedbackAPI: "https://api-geo-fr.thejoin.tech/send-feedback",
  getPlaceByNameAPI: 'https://api-geo-ny.thejoin.tech/places/get-by-name?q=%s&address=%s',
  // getPlacesAPI: 'https://api-geo-fr.thejoin.tech/places/explore?q=%s&address=%s&lat=%s&lng=%s',
  getPlacesAPI: 'https://' + API_DOMAIN + '.thejoin.tech/places/explore?q=%s&address=%s',
  getPlacesAPIFallback: 'https://api-geo-fr.thejoin.tech/places/explore-redis?q=%s&address=%s',
  searchSuggestAPI: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=%s&maxSuggestions=10&category=city,address&countryCode=&searchExtent=&location=&distance=&f=json',
  format: function format(str) {
    var args = [].slice.call(arguments, 1),
        i = 0;
    return str.replace(/%s/g, function () {
      return args[i++];
    });
  }
};
var CONTENT_CONSTANTS = {
  HELP_MODAL: {
    BODY: "\n      <p>Didn't find what you were looking for? <br/><u style=\"cursor: pointer\" onclick=\"Utils.searchByNameModal()\">Tap here to search by name \uD83D\uDD0D</u></p><input type=\"text\" id=\"email\" placeholder=\"Insert an email for an answer or leave blank\" /><textarea placeholder=\"Write here your question or tips\" rows=\"7\"></textarea><small><i>Note: this is not a search box</i></small>\n    "
  }
};

Number.prototype.toRad = function () {
  return this * Math.PI / 180;
};

Number.prototype.toDeg = function () {
  return this * 180 / Math.PI;
}; // Lat, Lng, Angle, Range in Km => get point of destination
// usage: destinationPoint(43.81, 11.13, 90, 10)


var Utils = {
  updateTimeout: null,
  geoErrorTimeout: null,
  suggestTimeout: null,
  geoErrorFailOverCount: 0,
  sendFeedback: function sendFeedback(body) {
    fetch(WaitingTimesAPI.feedbackAPI, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  },
  sendError: function sendError(requestBody) {
    requestBody["ua"] = navigator.userAgent;
    requestBody["date"] = new Date().toString();
    fetch(WaitingTimesAPI.logAPI, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  },
  searchSuggest: function searchSuggest(el) {
    clearTimeout(Utils.suggestTimeout);

    if (el.value.length >= 2) {
      Utils.suggestTimeout = setTimeout( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var fetchUrl, r, parentEl, noResult, json, addresses, i, text, resultElement;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.searchSuggestAPI, el.value);
                _context.next = 3;
                return fetch(fetchUrl);

              case 3:
                r = _context.sent;
                parentEl = document.getElementById('suggest-results');
                parentEl.innerHTML = "";
                noResult = true;

                if (!r.ok) {
                  _context.next = 13;
                  break;
                }

                _context.next = 10;
                return r.json();

              case 10:
                json = _context.sent;
                addresses = [];

                if (json["suggestions"].length > 0) {
                  noResult = false;

                  for (i in json["suggestions"]) {
                    text = json["suggestions"][i]["text"].slice(0, -5);
                    resultElement = document.createElement("div");
                    resultElement.className = "item-suggest-result";
                    resultElement.setAttribute('onclick', "document.getElementById('suggest-input').value = '" + text + "'; document.querySelector('#suggest-modal .container.teal .btn:nth-of-type(2)').click();");
                    resultElement.innerHTML = text;
                    parentEl.appendChild(resultElement);
                  }
                }

              case 13:
                if (noResult) parentEl.innerHTML = '<div class="item-suggest-result">No results</div>';

              case 14:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      })), 400);
    }
  },
  setDefaultLocation: function setDefaultLocation(address, lat, lng) {
    var obj = {
      "address": address,
      "latt": lat,
      "longt": lng
    };
    localStorage.setItem("defaultLocation", JSON.stringify(obj));
  },
  getDefaultLocation: function getDefaultLocation() {
    return JSON.parse(localStorage.getItem("defaultLocation"));
  },
  shouldShowWelcomeModal: function shouldShowWelcomeModal() {
    var hasSeenWelcomeModal = window.localStorage.getItem("hasSeenWelcomeModal");

    if (hasSeenWelcomeModal) {
      return hasSeenWelcomeModal === 'true' ? false : true;
    }

    return true;
  },
  showWelcomeModal: function showWelcomeModal() {
    var welcomeModal = document.getElementById('welcome-modal');
    welcomeModal.classList.add('show');
    welcomeModal.focus();

    if (TimesApp.address !== 'Firenze') {
      // Hide the 'Get Started' button
      document.querySelector('.welcome-modal__actions').style.display = "none";
    }
  },
  hideWelcomeModal: function hideWelcomeModal() {
    Utils.closeModal('welcome-modal');
    window.localStorage.setItem('hasSeenWelcomeModal', 'true');
    if (TimesApp.address === 'Firenze') TimesApp.initGeodata();
  },
  filterSidebarList: function filterSidebarList(el) {
    window.filterSidebarTimeout = window.filterSidebarTimeout || null;
    clearTimeout(window.filterSidebarTimeout);
    filterSidebarTimeout = setTimeout(function () {
      var value = el.value;
      var regexp = new RegExp(value, 'i');
      var items = document.querySelectorAll(".sidebar__item");

      for (var i = 0; i < items.length; i++) {
        var title = items[i].getAttribute("title");

        if (title.search(regexp) === -1 && value.length >= 2) {
          items[i].style.display = 'none';
        } else {
          items[i].style.display = 'block';
        }
      }
    }, 400);
  },
  showPlaceSidebar: function showPlaceSidebar() {
    var placeSidebar = document.getElementById('places-sidebar');
    placeSidebar.classList.add('show');
    placeSidebar.focus();
    document.getElementById('filter-sidebar').value = ''; // Reset list

    var sidebarItemContainer = document.querySelector('.sidebar__items');
    sidebarItemContainer.innerHTML = "";

    if (Object.keys(TimesApp.menuPlaces).length > 0) {
      for (var key in TimesApp.menuPlaces) {
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
        var isClosed = waitTimeArr[0] === 0 ? true : false;
        var noInfo = typeof waitTime === 'string' && !isClosed ? true : false;
        waitTime = isClosed ? "Closed" : waitTime;
        var badgeText = isClosed ? "Closed" : waitTime + " min";
        badgeText = noInfo ? "No info" : badgeText;
        var itemTitle = document.createElement("h2");
        itemTitle.className = "sidebar__item--title sidebar__item--title--bg-" + waitTime.toString().toLowerCase() + "min";
        itemTitle.innerHTML = place["name"];
        var itemSubtitle = document.createElement("p");
        itemSubtitle.className = "sidebar__item--subtitle";
        itemSubtitle.innerHTML = place["address"];
        var itemBadge = document.createElement("div");
        itemBadge.className = place["place_id"] + " sidebar__item--badge";
        var badgeBg = document.createElement("div");
        badgeBg.className = "text-center bg-" + waitTime.toString().toLowerCase() + "min";
        badgeBg.innerHTML = "<span>" + badgeText + "</span><br/>Last update <time>" + formattedTime + "</time>";
        itemBadge.appendChild(badgeBg);
        var sidebarItem = document.createElement("div");
        sidebarItem.setAttribute("onclick", "TimesApp.mapMarkers['" + key + "'].fireEvent('click')");
        sidebarItem.className = "sidebar__item";
        sidebarItem.setAttribute("title", place["name"] + " " + place["address"] + " - wait time: " + waitTime + "min");
        sidebarItem.appendChild(itemTitle);
        sidebarItem.appendChild(itemSubtitle);
        sidebarItem.appendChild(itemBadge);
        sidebarItemContainer.appendChild(sidebarItem);
      }
    }
  },
  showPlaceModal: function showPlaceModal(place_id) {
    var place = TimesApp.menuPlaces[place_id]["data"];
    var waitTimeArr = TimesApp.menuPlaces[place_id]["waitTimeArr"];
    var placeModal = document.getElementById('place-modal');
    placeModal.setAttribute("data-place-id", place["place_id"]);
    var formattedTime = "recent";

    if (place["updatetime"] !== undefined) {
      var date = new Date(place["updatetime"] * 1000);
      var hours = date.getHours();
      var minutes = "0" + date.getMinutes();
      formattedTime = hours + ':' + minutes.substr(-2);
    }

    var waitTime = waitTimeArr[1];
    var isClosed = waitTimeArr[0] === 0 ? true : false;
    var noInfo = typeof waitTime === 'string' && !isClosed ? true : false;
    waitTime = isClosed ? "Closed" : waitTime;
    var modalTitleEl = document.querySelector(".place-modal__title");
    modalTitleEl.innerHTML = place["name"];
    var modalSubtitleEl = document.querySelector(".place-modal__subtitle");
    modalSubtitleEl.innerHTML = place["address"];
    var modalBadgeEl = document.querySelector(".place-modal__badge div");
    var badgeText = isClosed ? "Closed" : waitTime + " min";
    badgeText = noInfo ? "No info" : badgeText;
    modalBadgeEl.setAttribute("class", "text-center bg-" + waitTime.toString().toLowerCase() + "min");
    var timeMinEl = document.querySelector("#time-min");
    timeMinEl.innerHTML = badgeText;
    var updateTimeEl = document.querySelector("#place-modal time");
    updateTimeEl.innerHTML = formattedTime;
    var timeRangeEl = document.querySelector("#time-range");
    timeRangeEl.value = typeof waitTimeArr[1] === 'string' ? 10 : waitTimeArr[1];
    placeModal.addEventListener('keyup', function (e) {
      console.log(e);
      var ESC_KEY = 'Escape';
      var KEY_PRESSED = e.key;

      if (KEY_PRESSED === ESC_KEY) {
        Utils.closeModal('place-modal');
      }
    });
    placeModal.classList.add('show');
    placeModal.focus();
  },
  hidePlaceModal: function hidePlaceModal(update) {
    var update = update || false;
    var placeModal = document.getElementById("place-modal");
    placeModal.classList.remove("show");

    if (update) {
      var feedback = {
        "place_id": placeModal.getAttribute("data-place-id"),
        "value": {
          "estimate_person": 0,
          "estimate_wait_min": parseInt(document.querySelector("#time-range").value)
        }
      };
      Utils.sendFeedback(feedback);
      var place = TimesApp.menuPlaces[placeModal.getAttribute("data-place-id")]["data"];
      place["user_feedback"] = feedback;
      place["user_feedback"]["estimate_wait_min"] = feedback["value"]["estimate_wait_min"];
      place["user_feedback"]["updatetime"] = new Date().getTime() / 1000;
      TimesApp.setPlaceOnMap([place]);
      if (document.querySelector('.sidebar.show') !== null) Utils.showPlaceSidebar();
    }
  },
  openSuggestModal: function openSuggestModal() {
    if (document.querySelector('.modal') !== null) document.body.removeChild(document.querySelector('.modal'));
    Utils.openModal("suggest-modal", "Search by address", '<input type="text" autocomplete="off" name="suggest-adr" onkeydown="Utils.searchSuggest(this)" placeholder="Insert your city or address" id="suggest-input"><div id="suggest-results"></div>', "Search", function searchBySuggest() {
      if (document.getElementById('suggest-input').value == '') {
        alert("Please, specify a place name and a place address.");
        return false;
      }

      TimesApp.address = document.getElementById('suggest-input').value;
      TimesApp.search(-1); // suggest-input

      document.body.removeChild(document.querySelector('.modal'));
    });
    document.getElementById('suggest-input').focus();
  },
  searchByNameModal: function searchByNameModal() {
    if (document.querySelector('.modal') !== null) document.body.removeChild(document.querySelector('.modal'));
    Utils.openModal("search-modal", "Search by name and address", '<input type="text" placeholder="Insert market or place name" id="place"><input type="text" placeholder="Insert address or city" id="address">', "Search", function searchByName() {
      if (document.getElementById('place').value == '' || document.getElementById('address').value == '') {
        alert("Please, specify a place name and a place address.");
        return false;
      }

      TimesApp.getPlace(document.getElementById('place').value, document.getElementById('address').value);
      document.body.removeChild(document.querySelector('.modal'));
    });
  },
  openModal: function openModal(id, title, content, actionText, actionFn, closeFn) {
    var id = id || new Date().getTime();
    var h2 = title;
    var actionText = actionText || 'Send';
    var modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal show';
    modal.tabIndex = '-1';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', title);
    modal.setAttribute('aria-modal', 'true');
    modal.addEventListener('keyup', function (e) {
      var ESC_KEY = 'Escape';
      var KEY_PRESSED = e.key;

      if (KEY_PRESSED === ESC_KEY) {
        Utils.closeModal(id);
      }
    });
    var modalInner = document.createElement('div');
    modalInner.className = 'modal-content animate-opacity card-4';
    modal.appendChild(modalInner);
    var headerModal = document.createElement('div');
    headerModal.className = 'container teal';
    modalInner.appendChild(headerModal);
    var containerContentDiv = document.createElement('div');
    containerContentDiv.className = 'container';
    modalInner.appendChild(containerContentDiv);
    containerContentDiv.innerHTML = content || CONTENT_CONSTANTS.HELP_MODAL.BODY;
    var buttonM = document.createElement("button");
    buttonM.setAttribute("type", "button");
    buttonM.className = 'close-button display-topright';
    buttonM.setAttribute("onclick", "Utils.closeModal('" + id + "')");
    buttonM.innerHTML = "&times; <span class='sr-only'>Close" + title + " modal</span>";
    headerModal.appendChild(buttonM);
    var headerM = document.createElement("H2");
    headerM.innerHTML = h2;
    headerModal.appendChild(headerM);
    var footer = document.createElement('div');
    footer.className = 'container teal';
    modalInner.appendChild(footer);
    var closeButton = document.createElement("button");
    closeButton.setAttribute('type', 'button');
    closeButton.className = 'btn';
    if (actionText !== -1) closeButton.style.float = "right";

    if (closeFn === undefined) {
      closeButton.setAttribute("onclick", "Utils.closeModal('" + id + "')");
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

    document.getElementsByTagName('body')[0].appendChild(modal);
    modal.focus();
  },
  closeModal: function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    modal.classList.remove('show');
  },
  getAccurateCurrentPosition: function getAccurateCurrentPosition(geolocationSuccess, geolocationError, geoprogress, options) {
    var lastCheckedPosition,
        locationEventCount = 0,
        watchID,
        timerID;
    options = options || {};

    var checkLocation = function checkLocation(position) {
      lastCheckedPosition = position;
      locationEventCount = locationEventCount + 1; // We ignore the first event unless it's the only one received because some devices seem to send a cached
      // location even when maxaimumAge is set to zero

      if (position.coords.accuracy <= options.desiredAccuracy && locationEventCount > 1) {
        clearTimeout(timerID);
        navigator.geolocation.clearWatch(watchID);
        foundPosition(position);
      } else {
        geoprogress(position);
      }
    };

    var stopTrying = function stopTrying() {
      navigator.geolocation.clearWatch(watchID);
      foundPosition(lastCheckedPosition);
    };

    var onError = function onError(error) {
      clearTimeout(timerID);
      navigator.geolocation.clearWatch(watchID);
      geolocationError(error);
    };

    var foundPosition = function foundPosition(position) {
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
  destinationPoint: function destinationPoint(lat, lng, brng, dist) {
    dist = dist / 6371;
    brng = brng.toRad();
    var lat1 = lat.toRad(),
        lon1 = lng.toRad();
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) + Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));
    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1), Math.cos(dist) - Math.sin(lat1) * Math.sin(lat2));
    if (isNaN(lat2) || isNaN(lon2)) return null;
    return [lat2.toDeg(), lon2.toDeg()];
  },
  toggleLegend: function toggleLegend(e) {
    if (document.getElementById('legend-values').style.display == 'none') {
      document.getElementById('legend-values').style.display = 'block';
      e.innerHTML = 'Legend ▾';
    } else {
      document.getElementById('legend-values').style.display = 'none';
      e.innerHTML = 'Legend ▴';
    }
  },
  distanceLatLng: function distanceLatLng(lat1, lon1, lat2, lon2) {
    var R = 6371; // km

    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad();
    var lat1 = lat1.toRad();
    var lat2 = lat2.toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  }
};
var last_address = localStorage.getItem("last_address");
var last_lat = localStorage.getItem("last_lat");
var last_lng = localStorage.getItem("last_lng");
var TimesApp = {
  startBoundIndex: 361,
  mapMarkers: {},
  menuPlaces: {},
  address: last_address !== null ? last_address : "Firenze",
  lat: last_lat !== null ? parseFloat(last_lat) : 43.7740236,
  lng: last_lng !== null ? parseFloat(last_lng) : 11.253233,
  zoom: 15,
  lMap: null,
  myPosition: null,
  query: "supermarket",
  isLoading: false,
  place_ids: [],
  icons: [],
  fullEstimation: true,
  setLoading: function setLoading(b) {
    TimesApp.isLoading = b;
    var display = b === true ? 'block' : 'none';
    document.getElementById('top-progress-bar').style.display = display;
  },
  initIcon: function initIcon() {
    var assetsPrefix = "/assets/custom-marker/";
    var iconAssets = ['0', '1', '2', '3', '4', '5', '6', '7', '8'];

    for (var key in iconAssets) {
      TimesApp.icons.push(L.icon({
        iconUrl: assetsPrefix + iconAssets[key] + '.png',
        iconSize: [42, 42],
        // size of the icon
        iconAnchor: [20, 32],
        // point of the icon which will correspond to marker's location
        popupAnchor: [2, -20] // point from which the popup should open relative to the iconAnchor

      }));
    }
  },
  initMap: function initMap(getPlaces) {
    var getPlaces = getPlaces || true;
    TimesApp.initIcon();
    TimesApp.lMap = L.map('full-map').setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 11,
      attribution: 'Map data <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(TimesApp.lMap); // TimesApp.lMap.zoomControl.remove();

    TimesApp.myPosition = L.circle([TimesApp.lat, TimesApp.lng], {
      color: '#0696c1',
      fillColor: '#06aee0',
      fillOpacity: 0.5,
      radius: 50
    }).bindPopup("Your position").addTo(TimesApp.lMap);
    TimesApp.lMap.on("moveend zoomend", /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(e) {
        var center;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                clearTimeout(Utils.updateTimeout);
                center = TimesApp.lMap.getCenter();
                console.log("new center ", center.toString());
                console.log(e.type);

                if (Utils.distanceLatLng(TimesApp.lat, TimesApp.lng, center.lat, center.lng) >= 2.5 || e.type == 'zoomend') {
                  Utils.updateTimeout = setTimeout( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            TimesApp.lat = parseFloat(center.lat);
                            TimesApp.lng = parseFloat(center.lng);
                            _context2.next = 4;
                            return TimesApp.updateAddress(-1);

                          case 4:
                            TimesApp.getPlaces(null, true);
                            _context2.next = 7;
                            return TimesApp.updateBound(TimesApp.lat, TimesApp.lng);

                          case 7:
                            TimesApp.getPharmacies();
                            localStorage.setItem("last_address", TimesApp.address);
                            localStorage.setItem("last_lat", TimesApp.lat);
                            localStorage.setItem("last_lng", TimesApp.lng);

                          case 11:
                          case "end":
                            return _context2.stop();
                        }
                      }
                    }, _callee2);
                  })), 1000);
                }

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3);
      }));

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    }());
    TimesApp.showLegend();
    if (getPlaces === true) TimesApp.getPlaces(null, true);
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
  getMarkerPlaceColor: function getMarkerPlaceColor(d) {
    return d > 60 ? [6, '#cc0c33'] : d > 45 ? [5, '#ff2929'] : d > 30 ? [4, '#fa4c25'] : d > 25 ? [3, '#fc7e2a'] : d > 15 ? [2, '#ffbf1c'] : d > 10 ? [1, '#ecf716'] : [0, '#1fcc00'];
  },
  showLegend: function showLegend() {
    var legend = L.control({
      position: 'bottomleft'
    });

    legend.onAdd = function (map) {
      var div = L.DomUtil.create('div', 'info legend'),
          grades = [5, 10, 15, 25, 30, 45, 60],
          labels = [],
          from,
          to;
      labels.push('<i style="background: #3f8ee2"></i> No info');

      for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];
        labels.push('<i style="background:' + TimesApp.getMarkerPlaceColor(grades[i] + 1)[1] + '"></i> ' + from + (to ? '&ndash;' + to : '+'));
      }

      div.innerHTML = "<span onclick=\"Utils.toggleLegend(this)\">Legend ▴</span><div style=\"display: none\" id=\"legend-values\"><u>Minutes</u>:<br>" + labels.join('<br>') + "</div>";
      return div;
    };

    legend.addTo(TimesApp.lMap);
  },
  getWaitTime: function getWaitTime(place) {
    var hour = new Date().getHours();
    var weekDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    var maxTimeSpent = 0;
    var meanTimeSpent = 0;
    var minTimeSpent = 0;

    if (place["time_spent"] !== undefined && place["time_spent"].length > 0) {
      place["time_spent"][0] = place["time_spent"][0] == 1 ? 60 : place["time_spent"][0];
      place["time_spent"][1] = place["time_spent"][1] == 1 ? 60 : place["time_spent"][1];
      maxTimeSpent = Math.max.apply(Math, _toConsumableArray(place["time_spent"]));
      minTimeSpent = Math.min.apply(Math, _toConsumableArray(place["time_spent"]));
      meanTimeSpent = place["time_spent"].reduce(function (a, b) {
        return a + b;
      }, 0) / 2;
    }

    var cPopularity = place["current_popularity"] || 0;
    var waitTimes = 0;
    var popTimes = 0;
    var populartimes = 1;
    if (place["time_wait"] !== undefined && place["time_wait"].length > 0) waitTimes = place["time_wait"][weekDay]["data"][hour];

    if (place["populartimes"] !== undefined) {
      populartimes = popTimes = place["populartimes"][weekDay]["data"][hour];
      if (new Date().getMinutes() >= 40 && place["populartimes"][weekDay]["data"][hour + 1] !== undefined && place["populartimes"][weekDay]["data"][hour + 1] != 0) popTimes = Math.floor((popTimes + place["populartimes"][weekDay]["data"][hour + 1]) / 2);
    }

    var meanIntersectPop = 0;
    var diffPopTimes = popTimes - cPopularity;
    var increase = popTimes > 0 ? meanTimeSpent : 0;

    if (cPopularity !== 0) {
      if (popTimes / cPopularity <= 3.3) {
        if (diffPopTimes <= 0 && waitTime > 10) {
          increase = maxTimeSpent + Math.ceil(cPopularity / 2 / 5) * 5;
        } else if (diffPopTimes > 0 && diffPopTimes < popTimes / 5) {
          increase = meanTimeSpent;
        } else if (diffPopTimes >= popTimes / 5 && diffPopTimes <= popTimes / 2.9) {
          increase = minTimeSpent;
        } else if (diffPopTimes > popTimes / 2.9 && diffPopTimes <= popTimes / 1.8) {
          increase = Math.ceil(minTimeSpent / 2 / 5) * 5;
        } else if (diffPopTimes > popTimes / 1.8 && diffPopTimes <= popTimes / 1.5) {
          increase = Math.ceil(minTimeSpent / 3 / 5) * 5;
        } else if (diffPopTimes > popTimes / 1.5) {
          increase = 0;
          waitTimes = Math.ceil(waitTimes * 20 / 100 / 5) * 5;
        }
      } else {
        if (cPopularity >= popTimes / 3.3) {
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
    var waitTime = Math.ceil((waitTimes + meanIntersectPop) / 5) * 5;
    if (popTimes !== 0 && cPopularity >= 18) waitTime += 5; // relative error, white rumor

    if (waitTime === 0 && (meanTimeSpent === 0 || cPopularity === 0)) waitTime = 'No information about ';
    return [populartimes, waitTime];
  },
  getPharmacies: function getPharmacies() {
    console.log("Getting pharmacy"); // TimesApp.getPlaces("pharmacy");
  },
  getPlace: function getPlace(q, address) {
    TimesApp.setLoading(true);
    var fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlaceByNameAPI, q, address);
    ga('send', 'event', 'Request', 'Place', q + ' ' + address);
    fetch(fetchUrl).then(function (r) {
      if (r.ok) return r.json();
    }).then(function (places) {
      TimesApp.setLoading(false);

      if (places[0]["place_id"] !== undefined && places[0]["coordinates"]["lat"] !== null) {
        TimesApp.setPlaceOnMap(places);
        TimesApp.lMap.setView([places[0]["coordinates"]["lat"], places[0]["coordinates"]["lng"]], TimesApp.zoom);
        TimesApp.mapMarkers[places[0]["place_id"]].fireEvent('click');
      } else {
        alert("You need to specify the full address of a place.");
      }
    }).catch(function (r) {
      return Utils.sendError({
        url: fetchUrl,
        singlePlace: true,
        message: r.toString()
      });
    });
  },
  getPlacesFallback: function () {
    var _getPlacesFallback = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4() {
      var fetchUrl;
      return regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlacesAPI.replace('api-geo-fr', 'api-geo-uk').replace('api-geo-ny', 'api-geo-uk'), TimesApp.query, TimesApp.address);
              ga('send', 'event', 'Request', 'Places', TimesApp.address);
              fetch(fetchUrl).then(function (r) {
                if (r.ok) return r.json();
              }).then(function (places) {
                return TimesApp.setPlaceOnMap(places);
              }).catch(function (r) {
                return Utils.sendError({
                  url: fetchUrl,
                  message: r.toString()
                });
              });

            case 3:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    }));

    function getPlacesFallback() {
      return _getPlacesFallback.apply(this, arguments);
    }

    return getPlacesFallback;
  }(),
  getPlaces: function getPlaces(query, useFallback) {
    var query = query || TimesApp.query;
    var useFallback = useFallback || false;
    TimesApp.setLoading(true); // const fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlacesAPI, query, TimesApp.address, TimesApp.lat, TimesApp.lng);

    if (useFallback) {
      var headers = new Headers();
      headers.append('x-geo-lat', TimesApp.lat);
      headers.append('x-geo-lng', TimesApp.lng);
      var fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.getPlacesAPIFallback, query, TimesApp.address);
      ga('send', 'event', 'Request', 'Places', TimesApp.address);
      fetch(fetchUrl, {
        headers: headers
      }).then(function (r) {
        if (r.ok) return r.json();
      }).then(function (places) {
        TimesApp.startBoundIndex = places.length <= 40 ? 120 : 361;
        TimesApp.setPlaceOnMap(places);
        TimesApp.updateBound(TimesApp.lat, TimesApp.lng);
      }).catch(function (r) {
        return TimesApp.getPlacesFallback();
      });
    } else {
      var placeUrl = WaitingTimesAPI.getPlacesAPI; // if (Math.floor(Math.random() * 21) == 10)
      //   placeUrl = placeUrl.replace('api-geo-fr', 'api-geo-uk');

      var _fetchUrl = WaitingTimesAPI.format(placeUrl, query, TimesApp.address);

      ga('send', 'event', 'Request', 'Places', TimesApp.address);
      fetch(_fetchUrl).then(function (r) {
        if (r.ok) return r.json();
      }).then(function (places) {
        return TimesApp.setPlaceOnMap(places);
      }).catch(function (r) {
        return TimesApp.getPlacesFallback();
      });
    }
  },
  setPlaceOnMap: function setPlaceOnMap(places) {
    console.log(places);
    TimesApp.setLoading(false);
    var pointMarkers = [];
    var tmpMenuPlaces = {};

    if (TimesApp.menuPlaces >= 140) {
      TimesApp.menuPlaces = {};
    }

    var _loop = function _loop(key) {
      // if (places[key]["populartimes"] === undefined) continue;
      waitTimeArr = TimesApp.getWaitTime(places[key]);
      waitTime = waitTimeArr[1]; // var radius = waitTime + 80;

      colors = TimesApp.getMarkerPlaceColor(waitTime);
      message = "<b>" + places[key]["name"] + "</b><br><small>" + places[key]["address"] + "</small><br/><i>" + waitTime + "min</i> of line"; // if (isNaN(radius)) radius = 80;

      if (waitTimeArr[0] === 0) {
        colors = ["7", "#777"]; // radius = 80;

        message = "<i>Closed</i><br/>" + message;
      }

      if (places[key]["user_feedback"] !== undefined && places[key]["user_feedback"]["estimate_wait_min"] !== undefined) {
        waitTime = places[key]["user_feedback"]["estimate_wait_min"];
        waitTimeArr[1] = waitTime;
        colors = TimesApp.getMarkerPlaceColor(waitTime);
        places[key]["updatetime"] = places[key]["user_feedback"]["updatetime"];
      }

      if (places[key]["updatetime"] !== undefined) {
        date = new Date(places[key]["updatetime"] * 1000);
        hours = date.getHours();
        minutes = "0" + date.getMinutes();
        formattedTime = hours + ':' + minutes.substr(-2);
        message += " - <i>Last update at</i> " + formattedTime;
      }

      icon = typeof waitTime === 'string' && colors[0] != '7' ? TimesApp.icons[8] : TimesApp.icons[colors[0]];
      var pointMarker = L.marker([places[key]["coordinates"]["lat"], places[key]["coordinates"]["lng"]], {
        icon: icon
      });

      if (TimesApp.place_ids.indexOf(places[key]["place_id"]) !== -1) {
        TimesApp.mapMarkers[places[key]["place_id"]].setIcon(icon);
        TimesApp.mapMarkers[places[key]["place_id"]].removeEventListener("click");
        TimesApp.menuPlaces[places[key]["place_id"]] = {
          data: places[key],
          waitTimeArr: waitTimeArr
        };
      } // pointMarker.bindPopup(message);


      pointMarker.addTo(TimesApp.lMap).on('click', function () {
        Utils.showPlaceModal(places[key]["place_id"]);
      });
      pointMarkers.push(pointMarker);
      tmpMenuPlaces[places[key]["place_id"]] = {
        data: places[key],
        waitTimeArr: waitTimeArr
      };
      TimesApp.mapMarkers[places[key]["place_id"]] = pointMarker;
      TimesApp.place_ids.push(places[key]["place_id"]);
    };

    for (var key in places) {
      var waitTimeArr;
      var waitTime;
      var colors;
      var message;
      var date;
      var hours;
      var minutes;
      var formattedTime;
      var icon;

      _loop(key);
    }

    if (Object.keys(tmpMenuPlaces).length > 0) TimesApp.menuPlaces = Object.assign(tmpMenuPlaces, TimesApp.menuPlaces);
    return pointMarkers;
  },
  updateAddressAwait: function () {
    var _updateAddressAwait = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5() {
      var r;
      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return fetch(WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng));

            case 2:
              r = _context5.sent;

              if (!r.ok) {
                _context5.next = 9;
                break;
              }

              _context5.next = 6;
              return r.json();

            case 6:
              _context5.t0 = _context5.sent;
              _context5.next = 10;
              break;

            case 9:
              _context5.t0 = {
                staddress: '',
                city: ''
              };

            case 10:
              r = _context5.t0;
              r.staddress = _typeof(r.staddress) === 'object' || r.staddress === undefined ? '' : r.staddress;
              r.city = _typeof(r.city) === 'object' || r.city === undefined ? '' : r.city;
              TimesApp.address = r.staddress !== '' ? r.staddress + ', ' : '';
              TimesApp.address += r.city;
              TimesApp.getPlaces();
              ga('send', 'event', 'Request', 'Geocode', WaitingTimesAPI.geocodeAPI);

            case 17:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5);
    }));

    function updateAddressAwait() {
      return _updateAddressAwait.apply(this, arguments);
    }

    return updateAddressAwait;
  }(),
  updateAddress: function () {
    var _updateAddress = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6() {
      var fetchUrl, keyUrl, r, json, error;
      return regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPIClient, TimesApp.lng, TimesApp.lat);
              keyUrl = 1;

              if (Math.floor(Math.random() * 15) == 5) {
                keyUrl = 0;
                fetchUrl = WaitingTimesAPI.format(WaitingTimesAPI.geocodeAPI, TimesApp.lat, TimesApp.lng);
              }

              _context6.next = 5;
              return fetch(fetchUrl);

            case 5:
              r = _context6.sent;
              json = {
                staddress: '',
                city: ''
              };

              if (!r.ok) {
                _context6.next = 13;
                break;
              }

              _context6.next = 10;
              return r.json();

            case 10:
              json = _context6.sent;
              _context6.next = 18;
              break;

            case 13:
              _context6.next = 15;
              return r.json();

            case 15:
              error = _context6.sent;
              Utils.sendError({
                url: fetchUrl,
                updateAddress: true,
                message: error.toString()
              });
              return _context6.abrupt("return", false);

            case 18:
              json.staddress = _typeof(json.staddress) === 'object' || json.staddress === undefined ? '' : json.staddress;
              json.city = _typeof(json.city) === 'object' || json.city === undefined ? '' : json.city;
              if (json.staddress === '' && json.address !== undefined) json.staddress = json.address["Address"] === undefined ? '' : json.address["Address"];
              if (json.city === '' && json.address !== undefined) json.city = json.address["City"] === undefined ? '' : json.address["City"];
              TimesApp.address = json.staddress !== '' ? json.staddress + ', ' : '';
              TimesApp.address += json.city;
              TimesApp.getPlaces(null, true);
              ga('send', 'event', 'Request', 'Geocode', keyUrl == 0 ? WaitingTimesAPI.geocodeAPI : WaitingTimesAPI.geocodeAPIClient);

            case 26:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6);
    }));

    function updateAddress() {
      return _updateAddress.apply(this, arguments);
    }

    return updateAddress;
  }(),
  updateBound: function () {
    var _updateBound = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(originLat, originLng) {
      var i, destLatLng;
      return regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              TimesApp.setLoading(true);
              i = 361;

            case 2:
              if (!(i <= 360)) {
                _context7.next = 13;
                break;
              }

              destLatLng = Utils.destinationPoint(originLat, originLng, i, 2.5);
              TimesApp.lat = parseFloat(destLatLng[0]);
              TimesApp.lng = parseFloat(destLatLng[1]);
              _context7.next = 8;
              return new Promise(function (resolve) {
                return setTimeout(resolve, 3000);
              });

            case 8:
              _context7.next = 10;
              return TimesApp.updateAddress(-1);

            case 10:
              i += 120;
              _context7.next = 2;
              break;

            case 13:
              TimesApp.setLoading(false);

            case 14:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7);
    }));

    function updateBound(_x2, _x3) {
      return _updateBound.apply(this, arguments);
    }

    return updateBound;
  }(),
  geoSuccess: function () {
    var _geoSuccess = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(position) {
      return regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              if (!(position === undefined)) {
                _context8.next = 3;
                break;
              }

              TimesApp.geoError();
              return _context8.abrupt("return", false);

            case 3:
              TimesApp.toggleSpinner();
              TimesApp.lat = parseFloat(position.coords.latitude);
              TimesApp.lng = parseFloat(position.coords.longitude);
              TimesApp.lMap.setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);
              _context8.next = 9;
              return TimesApp.updateAddress();

            case 9:
              _context8.next = 11;
              return TimesApp.updateBound(TimesApp.lat, TimesApp.lng);

            case 11:
              ga('send', 'event', 'Geolocation', 'GeoSuccess', 'true');

            case 12:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8);
    }));

    function geoSuccess(_x4) {
      return _geoSuccess.apply(this, arguments);
    }

    return geoSuccess;
  }(),
  showModalHelp: function showModalHelp() {
    if (document.querySelector('.modal') !== null) document.body.removeChild(document.querySelector('.modal'));
    Utils.openModal("help-modal", "Need help? Do you want to ask something?");
  },
  sendReview: function sendReview(rate) {
    var rate = rate || '0';
    ga('send', 'event', 'Review', 'Rate', rate);
    Utils.sendError({
      rate: rate
    });
    localStorage.setItem("sended_review", "yes");
    document.querySelector('.modal-content div.container').innerHTML = '<h2>Feedback sent, thank you!</h2>';
    setTimeout(function () {
      document.body.removeChild(document.getElementById('rating-modal'));
    }, 1200);
  },
  sendHelp: function sendHelp(message, email) {
    var email = email || "";

    if (message != '' && email != '') {
      Utils.sendError({
        message: message,
        email: email,
        help: true
      });
    }

    document.querySelector('.modal-content div.container').innerHTML = '<h2>Message sent, thank you!</h2>';
    setTimeout(function () {
      Utils.closeModal('help-modal');
    }, 1200);
  },
  fallbackGeocodeCall: function () {
    var _fallbackGeocodeCall = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(address) {
      var r, json;
      return regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return fetch(WaitingTimesAPI.format(WaitingTimesAPI.fallbackGeocodeAPI, address));

            case 2:
              r = _context9.sent;
              _context9.next = 5;
              return r.json();

            case 5:
              json = _context9.sent;

              if (json["candidates"] !== undefined && json["candidates"].length > 0) {
                json['latt'] = json["candidates"][0]['location']['y'];
                json['longt'] = json["candidates"][0]['location']['x'];
              } else {
                json["error"] = true;
              }

              return _context9.abrupt("return", json);

            case 8:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9);
    }));

    function fallbackGeocodeCall(_x5) {
      return _fallbackGeocodeCall.apply(this, arguments);
    }

    return fallbackGeocodeCall;
  }(),
  search: function () {
    var _search = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(ask) {
      var fetchUrl, r, json;
      return regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              ask = ask || true;
              if (ask === true) TimesApp.address = prompt("This app need your gps position or at least your address or your city:", "");

              if (!(TimesApp.address === null)) {
                _context10.next = 4;
                break;
              }

              return _context10.abrupt("return", false);

            case 4:
              TimesApp.setLoading(true);

              if (!(TimesApp.address != "")) {
                _context10.next = 26;
                break;
              }

              ga('send', 'event', 'Request', 'Search', TimesApp.address);
              fetchUrl = "https://geocode.xyz/" + TimesApp.address + "?json=1";
              _context10.next = 10;
              return fetch(fetchUrl);

            case 10:
              r = _context10.sent;
              _context10.next = 13;
              return r.json();

            case 13:
              json = _context10.sent;

              if (!(!r.ok || json['error'] !== undefined && json['error']['code'] === '006')) {
                _context10.next = 18;
                break;
              }

              _context10.next = 17;
              return TimesApp.fallbackGeocodeCall(TimesApp.address);

            case 17:
              json = _context10.sent;

            case 18:
              if (!(json["error"] !== undefined)) {
                _context10.next = 21;
                break;
              }

              setTimeout(function () {
                alert("No results. Check your address/city and try again. Please write the city in english");
                Utils.sendError({
                  url: fetchUrl,
                  search: true,
                  message: json["error"]
                });
                Utils.openSuggestModal();
              }, 2000);
              return _context10.abrupt("return", false);

            case 21:
              TimesApp.lat = parseFloat(json.latt);
              TimesApp.lng = parseFloat(json.longt);
              TimesApp.getPlaces(null, true);
              TimesApp.lMap.setView([TimesApp.lat, TimesApp.lng], TimesApp.zoom);
              TimesApp.updateBound(TimesApp.lat, TimesApp.lng);

            case 26:
            case "end":
              return _context10.stop();
          }
        }
      }, _callee10);
    }));

    function search(_x6) {
      return _search.apply(this, arguments);
    }

    return search;
  }(),
  promptAddress: function promptAddress() {
    return prompt("This app need your gps position or at least your address or your city:", "");
  },
  geoError: function () {
    var _geoError = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(e) {
      return regeneratorRuntime.wrap(function _callee11$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              TimesApp.toggleSpinner();
              Utils.openSuggestModal();

            case 2:
            case "end":
              return _context11.stop();
          }
        }
      }, _callee11);
    }));

    function geoError(_x7) {
      return _geoError.apply(this, arguments);
    }

    return geoError;
  }(),
  initGeodata: function initGeodata() {
    TimesApp.toggleSpinner();
    Utils.getAccurateCurrentPosition(TimesApp.geoSuccess, TimesApp.geoError, function (p) {
      console.log(p);
    }, {
      desiredAccuracy: 100,
      maxWait: 8000
    });
  },
  toggleSpinner: function toggleSpinner() {
    var spinnerEl = document.getElementById('loading');
    var displayProp = 'block';
    if (spinnerEl.style.display == 'block') displayProp = 'none';
    spinnerEl.style.display = displayProp;
  }
}; // DOMContentLoaded

document.addEventListener('DOMContentLoaded', function () {
  var mapEl = document.getElementById('full-map');
  mapEl.style.height = window.innerHeight + 'px';
  TimesApp.initMap(-1);

  if (Utils.shouldShowWelcomeModal()) {
    Utils.showWelcomeModal();
  } else if (last_address === null) {
    TimesApp.initGeodata();
  } else {
    TimesApp.getPlaces(null, true);
  }
  /*setTimeout(function () {
    document.getElementById('banner').style.display = "none";
  }, 30 * 1000);*/
  // Auto-refresh


  setTimeout(function () {
    TimesApp.getPlaces(null, true);
  }, 5 * 60 * 1000);

  if (localStorage.getItem('sended_review') !== 'yes') {
    setTimeout(function () {
      Utils.openModal('rating-modal', 'Please, take time to rate this project', "\n        <h4>Your feedback is very important to understand if the estimates are correct or not. Together we can build something useful!</h4>\n        <div class=\"rate\">\n          <input type=\"radio\" id=\"star5\" name=\"rate\" value=\"5\">\n          <label onclick=\"TimesApp.sendReview(this.getAttribute('data-value'))\" for=\"star5\" data-value=\"5\" title=\"5 stars\"><span class='sr-only'>5 stars</span></label>\n          <input type=\"radio\" id=\"star4\" name=\"rate\" value=\"4\">\n          <label onclick=\"TimesApp.sendReview(this.getAttribute('data-value'))\" for=\"star4\" data-value=\"4\" title=\"4 stars\"><span class='sr-only'>4 stars</span></label>\n          <input type=\"radio\" id=\"star3\" name=\"rate\" value=\"3\">\n          <label onclick=\"TimesApp.sendReview(this.getAttribute('data-value'))\" for=\"star3\" data-value=\"3\" title=\"3 stars\"><span class='sr-only'>3 stars</span></label>\n          <input type=\"radio\" id=\"star2\" name=\"rate\" value=\"2\">\n          <label onclick=\"TimesApp.sendReview(this.getAttribute('data-value'))\" for=\"star2\" data-value=\"2\" title=\"2 stars\"><span class='sr-only'>2 stars</span></label>\n          <input type=\"radio\" id=\"star1\" name=\"rate\" value=\"1\">\n          <label onclick=\"TimesApp.sendReview(this.getAttribute('data-value'))\" for=\"star1\" data-value=\"1\" title=\"1 star\"><span class='sr-only'>1 star</span></label>\n        </div>\n      ", -1);
    }, 120 * 1000);
  }
});

window.onerror = function (errorMessage, errorUrl, errorLine) {
  var requestBody = {
    date: new Date().toString(),
    ua: navigator.userAgent,
    errorMessage: errorMessage,
    errorUrl: errorUrl,
    errorLine: errorLine
  };
  Utils.sendError(requestBody);
};

window.addEventListener('appinstalled', function () {
  ga('send', 'event', 'PWA', 'Installed', 'true');
  Utils.sendError({
    "pwa_installed": true
  });
});

(function (i, s, o, g, r, a, m) {
  i['GoogleAnalyticsObject'] = r;
  i[r] = i[r] || function () {
    (i[r].q = i[r].q || []).push(arguments);
  }, i[r].l = 1 * new Date();
  a = s.createElement(o), m = s.getElementsByTagName(o)[0];
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-10999521-2', 'auto');
ga('set', 'anonymizeIp', true);
ga('send', 'pageview');

try {
  navigator.serviceWorker.register('/sw.js');
} catch (e) {
  console.log(e);
}
//# sourceMappingURL=main.js.map
