# Covid19 Waiting Times

This project aims to avoid the gatherings of people in various supermarkets and pharmacies during the covid-19 pandemic. Based on the geolocation of the device, it will show the various points of interest such as supermarkets, pharmacies, clinics, bars etc., with an estimate of the waiting time and a forecast of the next hour.

**NOTE**: This project do not wanna be for a commercial use. This project want to help people to stay outside their house the less time possible and to avoid other people for the quarantine period.

# How it works

The Front-end side is super simple and use the Open Street Map with the Leaflet.js library.

It use also the geocode.xyz API, client side, to retrieve the informations about the address and the city from the geo coordinates retrieve by the HTML5 API.

The Back-end is powered by Flask, a micro-framework for build some simples API to retrieve data from Google Places.

**NOTE**: this project do not use the official Google APIs, but it is working by a sort of workaround / bug. We can call this "scraping", but it is not the right word.

# Data

The data comes from Google, like Traffic for Maps, in real time and based on old data for the past week.
The data are splitted in hours and week days.

It's using the same data that you visualize by the Google Search Place, inside the local business card.
How many time to wait, how popular is the place and when.. etc etc.

# TODO

- Add search input in overlay
- Add sidebar to list all the visible places
- Change marker icon
- Add a sort of cache on the backend (e.g. Redis with Geopos operator)
- Add a way to store the place data to prevent an overload on the requested resource
- Add Pharmacy results

# Credits

The waitingtimes lib is based on the [populartimes python library](https://github.com/m-wrzr/populartimes/).
The geolocation utility comes from the [greg's repo](https://github.com/gregsramblings/getAccurateCurrentPosition).

Cheers.