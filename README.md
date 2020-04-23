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

The data comes from Google, like Traffic for Maps, in real time. The data are also based on the data of the past week, to have a history (Google based), the time spent inside a place and the estimated waiting time to be able to complete the purchase.

The waiting time is also based on the current popularity (readme as realtime) of a specific place. This feature is not available for all places, but for the vast majority it is. In this way, the estimated waiting times can still be reliable, since the calculations that are carried out on these data try to take into consideration the variables of the emergence such as social distancing, less influx of people in closed places etc.
The data is then divided into hours and weekdays.

In the future it will then perhaps be possible to give an estimate on the following hours.

**All times are to be kept as estimates.**

In fact, the same data that you would view on Google are used, i.e. the data within the local business.

Please, note that sometimes a place can have a parking area or other stuff where the geolocation can make some mistakes. I can not detect where the people are, if they are people or car, how many people are in the line etc etc. The estimates are based on the data that come from Google with an additional formula to get an approx time to wait. This error can change from a place to another.

# Start the Flask server

First of all you need to clone the repository on master branch.

Then install python >= 3.5 and its dev packages.
```
apt-get update
apt-get install python3-distutils python3.6 build-essential python3.6-dev
```

Then we can install the python package manager: pip.
```
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3.6 get-pip.py 
```

After installing pip, we need to install all these packages:
```
pip3.6 install flask flask-limiter flask-cors requests
```

Then we can start our dev server:
`python3.6 server/index.py`

# Other contributors
My friends for helping and support me as beta testers with a huge amount of feedback.
[danieldafoe](https://github.com/danieldafoe) for helping me on the frontend side.

# TODO

- Add search input in an overlay
- Get geoip information to searh place in region **in progress**
- Add a sidebar to list all the visible places **testing**
- Add autosuggest on search city/address **in progress**
- Add geocoding data from geocode API in client localStorage as a cache **in progress**
- Add history as #5
- Need to optimize the load avg to grant the access to 1500 users in 10min **testing**
- Add category filters and force estimation #6
- Refacotring UI/UX #9 **in progress**
- add favorites location
- guarantee accessibility **in progress**


# Credits

The waitingtimes lib is based on the [populartimes python library](https://github.com/m-wrzr/populartimes/).
The geolocation client utility comes from the [greg's repo](https://github.com/gregsramblings/getAccurateCurrentPosition).

The geolocation API used on the backend site is provided from [ArcGIS](https://developers.arcgis.com/).

Cheers.
