#!/usr/bin/env python
# -*- coding: utf-8 -*-

from .crawler import get_by_detail

import logging
logging.getLogger(__name__).addHandler(logging.NullHandler())

"""

ENTRY POINT

"""

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