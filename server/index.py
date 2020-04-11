from flask import Flask
from flask import jsonify, abort
from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address, get_ipaddr
from flask_cors import CORS, cross_origin

import uwsgidecorators
import redis

from queue import Queue
import threading

import waitingtimes
import hashlib
import json
import re

app = Flask(__name__)
q_detail = Queue()

typeRegex = r"(convenience)|(department_store)|(hypermarket)|(^shop)|(pharmacy)|(discount)|(cafe)|(delivery)|(food)|(medical)|(grocery)|(bakery)|(hospital)|(^supermarket)|(health)|(doctor)|(grocers)"
redisAvailable = True
r = None
try:
	r = redis.Redis(host='localhost', port=6379, db=2)
	rPersistence = redis.Redis(host='localhost', port=6379, db=3)
except Exception as e:
	redisAvailable = False

limiter = Limiter(
    app,
    key_func=get_ipaddr,
    default_limits=["10000 per day", "1000 per hour"]
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
			result = waitingtimes.get_by_fulldetail(item)
			formattedPlaces.append(result)
			if (isAdmittedPlace(result)):
				setKeyRedis(result["place_id"], json.dumps(result), 60*15)
				setKeyRedis(result["place_id"], json.dumps(result))
				if ("populartimes" in result):
					geoAddKeyRedis(result["place_id"], result["coordinates"]["lat"], result["coordinates"]["lng"])
		except Exception as e:
			print(e)
		q_detail.task_done()

@app.route("/places/get-waiting-times", methods=["POST"])
@cross_origin()
def get_place_from_place_name_address():
	wait_times = waitingtimes.get_by_fulldetail(request.json)
	return jsonify(wait_times)

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
		for place in places:
			if (place["name"] == None):
				continue

			obj = {
				"place_id": hashlib.md5((str(place["location"]["lat"])+str(place["location"]["lng"])).encode("utf-8")).hexdigest(),
				"formatted_address": place["address"],
				"name": place["name"],
				"types": place["categories"],
				"place_types": place["place_types"],
				"geometry": {
					"location": {
						"lat": place["location"]["lat"],
						"lng": place["location"]["lng"]
					}
				}
			}

			q_detail.put(obj)

		q_detail.join()

	return jsonify(formattedPlaces)

@app.route("/places/explore-redis", methods=["GET"])
@cross_origin()
def get_places_from_google_redis():
	global q_detail, formattedPlaces

	QUERY_SEARCH = "{} near {} open now"

	q = request.args.get("q") # supermarket or pharmacy
	address = request.args.get("address") # porta nuova, milano

	if (q == None or address == None):
		abort(400, "You need to provide your query string and your address")

	lat = request.headers.get('x-geo-lat')
	lng = request.headers.get("x-geo-lng")
	places = []
	if (lat != None and lng != None):
		places = getPlaceInRadius(float(lat), float(lng))

	if (places != None):
		places = [i for i in places if i]

	formattedPlaces = []
	if len(places) < 25 or places == None:
		try:
			places = waitingtimes.get_places_from_google(QUERY_SEARCH.format(q, address))
		except Exception as e:
			abort(500, e)
	else:
		tmpPlaces = []
		for el in places:
			tmpPlace = getPlaceFromRedis(el.decode())
			if (tmpPlace == None):
				r.zrem("places", el)
				continue
			if (tmpPlace != None and ("populartimes" in tmpPlace)):
				formattedPlaces.append(tmpPlace)
			elif ("time_spent" in tmpPlace or "time_wait" in tmpPlace):
				tmpPlaces.append(tmpPlace)
		# if (len(tmpPlaces) > 0):
		# 	places = tmpPlaces

	if (len(places) > 0):
		for place in places:
			try:
				place = place.decode()
			except (UnicodeDecodeError, AttributeError):
				pass
			if (place == None or "name" not in place or place["name"] == None):
				continue

			locationKey = "location"
			if ("coordinates" in place):
				locationKey = "coordinates"
			elif ("geometry" in place):
				place["location"] = place["geometry"]["location"]

			addressKey = "address"
			if ("formatted_address" in place):
				addressKey = "formatted_address"

			typesKey = "categories"
			if ("types" in place):
				typesKey = "types"

			obj = {
				"place_id": hashlib.md5((str(place[locationKey]["lat"])+str(place[locationKey]["lng"])).encode("utf-8")).hexdigest(),
				"formatted_address": place[addressKey],
				"name": place["name"],
				"types": place[typesKey],
				"place_types": place["place_types"],
				"geometry": {
					"location": {
						"lat": place[locationKey]["lat"],
						"lng": place[locationKey]["lng"]
					}
				}
			}

			q_detail.put(obj)

		q_detail.join()

	return jsonify(formattedPlaces)


@app.route("/logger", methods=["POST"])
@cross_origin()
def save_client_log():
	try:
		log = request.json
		with(open("/tmp/covid-client-map.log", "a")) as f:
			log["remote_addr"] = get_ipaddr()
			f.write(json.dumps(log))
			f.close()
	except Exception as e:
		print(e)

	return jsonify({"ok": 200})


def getPlaceFromRedis (key):
	global r, rPersistence
	place = r.get(key)
	if (place == None):
		place = rPersistence.get(key)

	if (place != None):
		place = json.loads(place.decode())

	return place

def getPlaceInRadius (lat, lng, distance=20):
	global r
	return r.georadius(
		"places",
		lng,
		lat,
		distance,
		unit="km",
		withdist=False,
		count=180,
		sort="ASC"
	)

def isAdmittedPlace (place):
	if ("place_types" in place):
		if (place["place_types"] == None):
			return False

		typeList = []
		for j in range(0, len(place["place_types"])):
			for v in place["place_types"][j]:
				typeList.append(v)

		types = ",".join(typeList)
		if (re.search(typeRegex, types) == None):
			return False
	return True

def setKeyRedis (key, value, ttl=0):
	global r, rPersistence

	try:
		connectionToUse = r
		if (ttl == 0):
			connectionToUse = rPersistence

		connectionToUse.set(key, value)
		if (ttl > 0):
			connectionToUse.expire(key, ttl)
	except Exception as e:
		print("error key on " + str(e))

def geoAddKeyRedis (key, lat, lng):
	global r
	try:
		r.geoadd('places',lng, lat, key)
	except Exception as e:
		print("error geo on " + str(e))

@uwsgidecorators.postfork
@uwsgidecorators.thread
def initThread():
	while (threading.active_count() <= 400):
		t = threading.Thread(target=worker_fulldetail)
		t.daemon = True
		t.start()

if __name__ == '__main__':
	initThread()

	app.run(host="0.0.0.0")
