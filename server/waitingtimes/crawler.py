#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import urllib.request
import urllib.parse
import ssl
import re
import calendar
import requests
import os
from random import randrange

HERE_BASE_URL = "https://places.ls.hereapi.com/places/v1/"
HERE_GEOCODE_BASE_URL = "https://revgeocode.search.hereapi.com/v1/"
BROWSE_URL = HERE_BASE_URL + "browse?in={},{};r={}&result_types=place&tf=plain&cs=&size={}&cat={}&apiKey={}"
GEOCODE_URL = "https://geocode.xyz/{},{}?geoit=json&auth={}"
GEOCODE_HERE_URL = HERE_GEOCODE_BASE_URL + "revgeocode?at={},{}&lang=it-IT&apiKey={}"
GEOCODE_ARCGIS_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=pjson&featureTypes=&location={},{}"

COMMON_HEADERS = {
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip"
}

# user agent for populartimes request
USER_AGENT = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/80.0.3987.149 Safari/537.36"}

def get_info_from_geocode_arcgis(lat, lng):
    info = json.loads(requests.get(GEOCODE_ARCGIS_URL.format(lng, lat)).text)

    if ("address" not in info):
        raise Exception("No info from geocode")

    if ("Address" in info["address"]):
        info["staddress"] = info["address"]["Address"]

    if ("City" in info["address"]):
        info["city"] = info["address"]["City"]

    return info

def get_info_from_geocode(lat, lng):
    if (os.environ.get('HERE_PLACE_API_KEY') == None):
        raise Exception("You need to add an environment variable for HERE_PLACE_API_KEY")

    if (randrange(0,3) != 0):
        return get_info_from_geocode_arcgis(lat, lng)

    info = json.loads(requests.get(GEOCODE_HERE_URL.format(lat, lng, os.environ.get('HERE_PLACE_API_KEY'))).text)

    if ("items" not in info):
        raise Exception("No info from geocode")

    info["items"][0]["staddress"] = ""
    if ("street" in info["items"][0]["address"]):
        info["items"][0]["staddress"] = info["items"][0]["address"]["street"]

    info["items"][0]["city"] = ""
    if ("city" in info["items"][0]["address"]):
        info["items"][0]["city"] = info["items"][0]["address"]["city"]
    
    return info["items"][0]

def get_places_by_search(q):
    """
    Make an API request to google web service to retrieve a list of places
    """
    places = []
    json = make_google_search_request(q)
    json = json[0][1]
    for x in range(1, len(json)-1):
        info = index_get(json[x], 14)

        places.append({
            "name": index_get(info, 11),
            "address": index_get(info, 39),
            "location": {
                "lat": index_get(info, 9, 2),
                "lng": index_get(info, 9, 3)
            },
            "categories": index_get(info, 13),
            "place_types": index_get(info, 76),
        })

    return places

def get_places_by_query(query):
    """
    make an API request to the HERE PLACES API to retrieve a list of places by geo
    :param query: the parameters to make the request
    :return: None if not available or the list of places
    """

    if (os.environ.get("HERE_PLACE_API_KEY") == None):
        raise Exception("No HERE_PLACE_API_KEY in your environment")

    if ("limit" not in query):
        query["limit"] = 35

    _lat = query["location"]["lat"]
    _lng = query["location"]["lng"]

    browse_query = BROWSE_URL.format(
        _lat, _lng, query["radius"], query["limit"], ",".join(query["types"]), os.environ.get("HERE_PLACE_API_KEY")
    )

    res = json.loads(requests.get(browse_query, headers=COMMON_HEADERS).text)
    if ("results" not in res):
        raise Exception("No results")

    if ("items" not in res["results"]):
        raise Exception("No items")

    return res["results"]["items"]



def get_popularity_for_day(popularity):
    """
    Returns popularity for day
    :param popularity:
    :return:
    """

    # Initialize empty matrix with 0s
    pop_json = [[0 for _ in range(24)] for _ in range(7)]
    wait_json = [[0 for _ in range(24)] for _ in range(7)]

    for day in popularity:

        day_no, pop_times = day[:2]

        if pop_times:
            for hour_info in pop_times:

                hour = hour_info[0]
                pop_json[day_no - 1][hour] = hour_info[1]

                # check if the waiting string is available and convert no minutes
                if len(hour_info) > 5:
                    wait_digits = re.findall(r'\d+', hour_info[3])

                    if len(wait_digits) == 0:
                        wait_json[day_no - 1][hour] = 0
                    elif "min" in hour_info[3]:
                        wait_json[day_no - 1][hour] = int(wait_digits[0])
                    elif "hour" in hour_info[3]:
                        wait_json[day_no - 1][hour] = int(wait_digits[0]) * 60
                    else:
                        wait_json[day_no - 1][hour] = int(wait_digits[0]) * 60 + int(wait_digits[1])

                # day wrap
                if hour_info[0] == 23:
                    day_no = day_no % 7 + 1

    ret_popularity = [
        {
            "name": list(calendar.day_name)[d],
            "data": pop_json[d]
        } for d in range(7)
    ]

    # waiting time only if applicable
    ret_wait = [
        {
            "name": list(calendar.day_name)[d],
            "data": wait_json[d]
        } for d in range(7)
    ] if any(any(day) for day in wait_json) else []

    # {"name" : "monday", "data": [...]} for each weekday as list
    return ret_popularity, ret_wait


def index_get(array, *argv):
    """
    checks if a index is available in the array and returns it
    :param array: the data array
    :param argv: index integers
    :return: None if not available or the return value
    """

    try:

        for index in argv:
            array = array[index]

        return array

    # there is either no info available or no popular times
    # TypeError: rating/rating_n/populartimes wrong of not available
    except (IndexError, TypeError):
        return None


def add_optional_parameters(detail_json, detail, rating, rating_n, popularity, current_popularity, time_spent, detailFromGoogle={}):
    """
    check for optional return parameters and add them to the result json
    :param detail_json:
    :param detail:
    :param rating:
    :param rating_n:
    :param popularity:
    :param current_popularity:
    :param time_spent:
    :return:
    """

    if rating:
        detail_json["rating"] = rating
    elif "rating" in detail:
        detail_json["rating"] = detail["rating"]

    if rating_n:
        detail_json["rating_n"] = rating_n

    if "international_phone_number" in detail:
        detail_json["international_phone_number"] = detail["international_phone_number"]

    if current_popularity:
        detail_json["current_popularity"] = current_popularity

    if popularity:
        popularity, wait_times = get_popularity_for_day(popularity)

        detail_json["populartimes"] = popularity

        if wait_times:
            detail_json["time_wait"] = wait_times

    if time_spent:
        detail_json["time_spent"] = time_spent

    if ("name" in detailFromGoogle):
        detail_json.update(detailFromGoogle)

    return detail_json

def make_google_search_request(query_string):
    params_url = {
        "tbm": "map",
        "tch": 1,
        "hl": "it",
        "q": urllib.parse.quote_plus(query_string),
        "pb": "!4m12!1m3!1d4005.9771522653964!2d-122.42072974863942!3d37.8077459796541!2m3!1f0!2f0!3f0!3m2!1i1125!2i976"
              "!4f13.1!7i20!10b1!12m6!2m3!5m1!6e2!20e3!10b1!16b1!19m3!2m2!1i392!2i106!20m61!2m2!1i203!2i100!3m2!2i4!5b1"
              "!6m6!1m2!1i86!2i86!1m2!1i408!2i200!7m46!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e3!2b0!3e3!"
              "1m3!1e4!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e3!2b1!3e2!1m3!1e9!2b1!3e2!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e"
              "10!2b0!3e4!2b1!4b1!9b0!22m6!1sa9fVWea_MsX8adX8j8AE%3A1!2zMWk6Mix0OjExODg3LGU6MSxwOmE5ZlZXZWFfTXNYOGFkWDh"
              "qOEFFOjE!7e81!12e3!17sa9fVWea_MsX8adX8j8AE%3A564!18e15!24m15!2b1!5m4!2b1!3b1!5b1!6b1!10m1!8e3!17b1!24b1!"
              "25b1!26b1!30m1!2b1!36b1!26m3!2m2!1i80!2i92!30m28!1m6!1m2!1i0!2i0!2m2!1i458!2i976!1m6!1m2!1i1075!2i0!2m2!"
              "1i1125!2i976!1m6!1m2!1i0!2i0!2m2!1i1125!2i20!1m6!1m2!1i0!2i956!2m2!1i1125!2i976!37m1!1e81!42b1!47m0!49m1"
              "!3b1"
    }

    search_url = "https://www.google.com/search?" + "&".join(k + "=" + str(v) for k, v in params_url.items())

    # noinspection PyUnresolvedReferences
    gcontext = ssl.SSLContext(ssl.PROTOCOL_TLSv1)

    resp = urllib.request.urlopen(urllib.request.Request(url=search_url, data=None, headers=USER_AGENT),
                                  context=gcontext)
    data = resp.read().decode('utf-8').split('/*""*/')[0]

    # find eof json
    jend = data.rfind("}")
    if jend >= 0:
        data = data[:jend + 1]

    jdata = json.loads(data)["d"]
    return json.loads(jdata[4:])

def get_populartimes_from_search(place_identifier, get_detail=False):
    """
    request information for a place and parse current popularity
    :param place_identifier: name and address string
    :return:
    """
    
    jdata = make_google_search_request(place_identifier)

    # get info from result array, has to be adapted if backend api changes
    info = index_get(jdata, 0, 1, 0, 14)

    rating = index_get(info, 4, 7)
    rating_n = index_get(info, 4, 8)

    popular_times = index_get(info, 84, 0)

    # current_popularity is also not available if popular_times isn't
    current_popularity = index_get(info, 84, 7, 1)

    time_spent = index_get(info, 117, 0)

    detail = {}
    if (get_detail == True):
        detail = {
            "name": index_get(info, 11),
            "address": index_get(info, 39),
            "coordinates": {
                "lat": index_get(info, 9, 2),
                "lng": index_get(info, 9, 3)
            },
            "categories": index_get(info, 13),
            "place_types": index_get(info, 76),
        }

    # extract wait times and convert to minutes
    if time_spent:

        nums = [float(f) for f in re.findall(r'\d*\.\d+|\d+', time_spent.replace(",", "."))]
        contains_min, contains_hour = "min" in time_spent, "hour" in time_spent or "hr" in time_spent

        time_spent = None

        if contains_min and contains_hour:
            time_spent = [nums[0], nums[1] * 60]
        elif contains_hour:
            time_spent = [nums[0] * 60, (nums[0] if len(nums) == 1 else nums[1]) * 60]
        elif contains_min:
            time_spent = [nums[0], nums[0] if len(nums) == 1 else nums[1]]

        time_spent = [int(t) for t in time_spent]

    return rating, rating_n, popular_times, current_popularity, time_spent, detail


def get_by_detail(detail, get_detail=False):
    place_identifier = "{} {}".format(detail["name"], detail["formatted_address"])

    detail_json = {
        "place_id": detail["place_id"],
        "name": detail["name"],
        "address": detail["formatted_address"],
        "types": detail["types"],
        "place_types": detail["place_types"],
        "coordinates": detail["geometry"]["location"]
    }

    detail_json = add_optional_parameters(detail_json, detail, *get_populartimes_from_search(place_identifier, get_detail))

    return detail_json

if __name__ == "__main__":
    pass