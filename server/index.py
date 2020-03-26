from flask import Flask
from flask import jsonify, abort
from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS, cross_origin

from queue import Queue
import threading

import waitingtimes
import hashlib

app = Flask(__name__)
q_detail = Queue()

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "100 per hour"]
)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

# rate limit 10/sec
@app.route("/geocode", methods=["GET"])
@cross_origin()
def get_geocode_address():
	"""
	retrieve information, from lat and lng, about the location
	"""
	lat = request.args.get("lat")
	lng = request.args.get("lng")
	if (lng == None or lat == None):
		abort(400, "You need to provide at least your gps coords")

	try:
		response = waitingtimes.get_address_from_geocode(lat, lng)
	except Exception as e:
		abort(500, e)

	return jsonify(response)


def worker_fulldetail():
	"""
	worker for the queue; it will serve the results then
	"""
	global q_detail, formattedPlaces

	while True:
		item = q_detail.get()
		try:
			formattedPlaces.append(waitingtimes.get_by_fulldetail(item))
		except Exception as e:
			print(e)
		q_detail.task_done()

@app.route("/places/explore", methods=["GET"])
@cross_origin()
def get_places_from_google():
	global q_detail, formattedPlaces

	QUERY_SEARCH = "{} near {} open now"

	q = request.args.get("q") # supermarket or pharmacy
	address = request.args.get("address") # porta nuova, milano

	if (q == None or address == None):
		abort(400, "You need to provide your query string and your address")

	try:
		places = waitingtimes.get_places_from_google(QUERY_SEARCH.format(q, address))
	except Exception as e:
		abort(500, e)

	formattedPlaces = []

	if (len(places) > 0):
		for i in range(20):
			t = threading.Thread(target=worker_fulldetail)
			t.daemon = True
			t.start()

		for place in places:
			if (place["name"] == None):
				continue
			
			q_detail.put({
				"place_id": hashlib.md5((str(place["location"]["lat"])+str(place["location"]["lng"])).encode("utf-8")).hexdigest(),
				"formatted_address": place["address"],
				"name": place["name"],
				"types": place["categories"],
				"geometry": {
					"location": {
						"lat": place["location"]["lat"],
						"lng": place["location"]["lng"]
					}
				}
			})

		q_detail.join()

	return jsonify(formattedPlaces)


""" @app.route("/places/browse", methods=["GET"])
def get_places_from_here():
	lat = request.args.get("lat")
	lng = request.args.get("lng")
	if (lng == None or lat == None):
		abort(400, "You need to provide at least your gps coords (lat, lng)")

	try:
		places = waitingtimes.get_places_from_here({
	    "types": ["food-drink", "pharmacy", "post-office", "postal-area"],
	    "location": {
	        "lat": lat,
	        "lng": lng
	    },
	    "radius": 6000
	  })
	except Exception as e:
		abort(500, e)

	formattedPlaces = []

	if (len(places) > 0):
		for x in range(0, len(places)-1):
			print("processing: " + places[x]["title"])
			formattedPlaces.append(
				waitingtimes.get_by_fulldetail({
				"accepted_place_type": ["bakery", "bank", "bar", "cafe", "doctor", "drugstore", "food", "health", "hospital", "meal_delivery", "meal_takeaway", "pharmacy", "post_office", "postal_code", "postal_town", "restaurant", "shopping_mall", "supermarket", "grocery_store", "discount_supermarket", "supermarket", "grocery"],
			    "place_id": places[x]["id"],
			    "formatted_address": places[x]["vicinity"].replace("\n", " "),
			    "name": places[x]["title"],
			    "types": places[x]["category"]["id"],
			    "geometry": {
			        "location": {
			            "lat": places[x]["position"][0],
			            "lng": places[x]["position"][1]
			        }
			    }
				})
			)

	return jsonify(formattedPlaces) """

if __name__ == '__main__':
	app.run(port=2354)