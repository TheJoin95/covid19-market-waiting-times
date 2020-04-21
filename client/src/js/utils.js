// Lat, Lng, Angle, Range in Km => get point of destination
// usage: destinationPoint(43.81, 11.13, 90, 10)

module.exports = {
  updateTimeout: null,
  geoErrorTimeout: null,
  geoErrorFailOverCount: 0,
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

window.utils = module.exports;