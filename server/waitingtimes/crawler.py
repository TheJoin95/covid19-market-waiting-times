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

BASE_URL = "https://places.ls.hereapi.com/places/v1/"
BROWSE_URL = BASE_URL + "browse?in={},{};r={}&result_types=place&tf=plain&cs=&size={}&cat={}&apiKey={}"

COMMON_HEADERS = {
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip"
}

# user agent for populartimes request
USER_AGENT = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/80.0.3987.149 Safari/537.36"}

#  {
#   "position" : [ 43.823567, 11.119269 ],
#   "distance" : 1356,
#   "title" : "Bar Pasticceria il Grillo",
#   "averageRating" : 0.0,
#   "category" : {
#     "id" : "food-drink",
#     "title" : "Cibo e bevande",
#     "href" : "https://places.ls.hereapi.com/places/v1/categories/places/food-drink?app_id=HZ1QBizc8VRERhzxYxyX&app_code=ZysIlwIFyllmSILbYckA6w",
#     "type" : "urn:nlp-types:category",
#     "system" : "places"
#   },
#   "icon" : "https://download.vcdn.data.here.com/p/d/places2/icons/categories/09.icon",
#   "vicinity" : "Via Palestro<br/>50013 Campi Bisenzio",
#   "having" : [ ],
#   "type" : "urn:nlp-types:place",
#   "href" : "https://places.ls.hereapi.com/places/v1/places/380spzcm-18c55235b8cb428e86c21ab03e3a9e89;context=Zmxvdy1pZD04MDUzNjcxZi05Y2UzLTVmNjEtYWJlOC01NDIzN2Y5ZmIxMzZfMTU4NTA3MDYwMTU4N18wXzI4MjEmcmFuaz0w?app_id=HZ1QBizc8VRERhzxYxyX&app_code=ZysIlwIFyllmSILbYckA6w",
#   "tags" : [ {
#     "id" : "italian",
#     "title" : "Italiana",
#     "group" : "cuisine"
#   } ],
#   "id" : "380spzcm-18c55235b8cb428e86c21ab03e3a9e89",
#   "openingHours" : {
#     "text" : "lun-dom: 06:00 - 05:30",
#     "label" : "Orario di apertura",
#     "isOpen" : true,
#     "structured" : [ {
#       "start" : "T060000",
#       "duration" : "PT23H30M",
#       "recurrence" : "FREQ:DAILY;BYDAY:MO,TU,WE,TH,FR,SA,SU"
#     } ]
#   },
#   "alternativeNames" : [ {
#     "name" : "Bar Pasticceria Il Grillo",
#     "language" : "de"
#   } ]
# }

def get_places_by_query(query):
    """
    make an API request to the HERE PLACES API to retrieve a list of places by geo
    :param query: the parameters to make the request
    :return: None if not available or the list of places
    """

    if (os.environ.get("HERE_PLACE_API_KEY") == None):
        raise Exception("No HERE_PLACE_API_KEY in your environment");

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


def add_optional_parameters(detail_json, detail, rating, rating_n, popularity, current_popularity, time_spent):
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

    return detail_json


def get_populartimes_from_search(place_identifier):
    """
    request information for a place and parse current popularity
    :param place_identifier: name and address string
    :return:
    """
    params_url = {
        "tbm": "map",
        "tch": 1,
        "hl": "it",
        "q": urllib.parse.quote_plus(place_identifier),
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
    jdata = json.loads(jdata[4:])

    # get info from result array, has to be adapted if backend api changes
    info = index_get(jdata, 0, 1, 0, 14)

    rating = index_get(info, 4, 7)
    rating_n = index_get(info, 4, 8)

    popular_times = index_get(info, 84, 0)

    # current_popularity is also not available if popular_times isn't
    current_popularity = index_get(info, 84, 7, 1)

    time_spent = index_get(info, 117, 0)

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

    return rating, rating_n, popular_times, current_popularity, time_spent


def get_by_detail(detail):
    place_identifier = "{} {}".format(detail["name"], detail["formatted_address"])

    detail_json = {
        "id": detail["place_id"],
        "name": detail["name"],
        "address": detail["formatted_address"],
        "types": detail["types"],
        "coordinates": detail["geometry"]["location"]
    }

    detail_json = add_optional_parameters(detail_json, detail, *get_populartimes_from_search(place_identifier))

    return detail_json

if __name__ == "__main__":
    pass