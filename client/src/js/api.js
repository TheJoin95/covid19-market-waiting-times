// API

const API_DOMAIN_AVAILABLE = ["api-geo-fr", "api-geo-ny"];
const API_DOMAIN = API_DOMAIN_AVAILABLE[Math.floor(Math.random() * API_DOMAIN_AVAILABLE.length)];

exports.WaitingTimesAPI = {
  fallbackGeocodeAPI:
    "https://nominatim.openstreetmap.org/search.php?q=%s&format=json",
  geocodeAPI: "https://api-geo.thejoin.tech/geocode?lat=%s&lng=%s",
  geocodeAPIClient:
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&featureTypes=&location=%s,%s",
  // geocodeAPI: 'https://geocode.xyz/%s,%s?json=1',
  logAPI: "https://api-geo.thejoin.tech/logger",
  feedbackAPI: "https://api-geo-fr.thejoin.tech/send-feedback",
  getPlaceByNameAPI:
    "https://api-geo-ny.thejoin.tech/places/get-by-name?q=%s&address=%s",
  // getPlacesAPI: 'https://api-geo-fr.thejoin.tech/places/explore?q=%s&address=%s&lat=%s&lng=%s',
  getPlacesAPI:
    "https://" + API_DOMAIN + ".thejoin.tech/places/explore?q=%s&address=%s",
  getPlacesAPIFallback:
    "https://api-geo-fr.thejoin.tech/places/explore-redis?q=%s&address=%s",
  searchSuggestAPI:
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=%s&maxSuggestions=10&category=city,address&countryCode=&searchExtent=&location=&distance=&f=json",
  format: function (str) {
    var args = [].slice.call(arguments, 1),
      i = 0;

    return str.replace(/%s/g, () => args[i++]);
  },
};

exports.API_DOMAIN_AVAILABLE = API_DOMAIN_AVAILABLE;
exports.API_DOMAIN = API_DOMAIN_AVAILABLE;