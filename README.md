# Covid19 Waiting Times

This project aims to avoid the gatherings of people in various supermarkets and pharmacies during the covid-19 pandemic. Based on the geolocation of the device, it will show various points of interest such as supermarkets, pharmacies, clinics, bars etc., with an estimate waiting time and a forecast of the next hour.

**NOTE**: This project does not wanna be for commercial use. This project wants to help people to stay outside their house as little time as possible and to avoid other people for the quarantine period.

![snippet](https://raw.githubusercontent.com/TheJoin95/covid19-market-waiting-times/master/client/assets/map.png)

# How it works

The Front-end side is super simple and uses Open Street Map with the Leaflet.js library.

It uses also geocode.xyz API, client side, to retrieve details about the address and the city from the geo-coordinates retrieve by the HTML5 API.

The Back-end is powered by Flask, a micro-framework for building some simple APIs to retrieve data from Google Places.

**NOTE**: this project does not use the official Google APIs, but it is working via a sort of workaround / bug. We can call this "scraping", but it is not the right word.

# Data

The data comes from Google, like Traffic for Maps, in real-time and based on old data for the past week.
The data are split into hours and weekdays.

It's using the same data that you'd view on Google if you search a place, i.e. the data inside the local business card.
How many time to wait, how popular is the place and when.. etc etc.

# TODO

- Add search input in an overlay
- Add a sidebar to list all the visible places
- Add a sort of cache on the backend (e.g. Redis with Geopos operator) **in progress**
- Add a way to store the place data to prevent an overload on the requested resource **in progress**
- Add a refresh function
- Add a prevent function to reload the same data in the same areas
- Refactoring & Build & Uglify **in progress**

# Credits

The waitingtimes lib is based on the [populartimes python library](https://github.com/m-wrzr/populartimes/).
The geolocation utility comes from the [greg's repo](https://github.com/gregsramblings/getAccurateCurrentPosition).

Cheers.
