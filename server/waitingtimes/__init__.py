#!/usr/bin/env python
# -*- coding: utf-8 -*-

from .crawler import get_by_detail
from .crawler import get_places_by_query
from .crawler import get_places_by_search
from .crawler import get_info_from_geocode

"""

ENTRY POINT

"""

def get_address_from_geocode(lat, lng):
    """
    retrieve information from geo coordinates
    """

    return get_info_from_geocode(lat, lng)

def get_places_from_google(query):
    """
    retrieve a list of places
    query: string
    "supermarket campi bisenzio open now"
    """

    return get_places_by_search(query)

def get_places_from_here(query):
    """
    retrieve a list of places
    {
        "types": ["food-drink", "pharmacy", "post-office", "postal-area"],
        "accepted-place-type": ["bakery", "bank", "bar", "cafe", "doctor", "drugstore", "food", "health", "hospital", "meal_delivery", "meal_takeaway", "pharmacy", "post_office", "postal_code", "postal_town", "restaurant", "shopping_mall", "supermarket", "grocery_store", "discount_supermarket", "supermarket", "grocery"],
        "location": {
            "lat": 43.33,
            "lng": 11.23
        },
        "radius": 6000
    }
    """
    return get_places_by_query(query)


def get_by_fulldetail(place_detail):
    """
    retrieves the current popularity for a given place
    :param place_detail
    {
        "place_id": "",
        "formatted_address": "",
        "name": "",
        "types": "Supermarket",
        "geometry": {
            "location": {
                "lat": 0,
                "lng": 0
            }
        }
    }
    :return: see readme
    """
    return get_by_detail(place_detail)