import redis
import time
import waitingtimes
import hashlib
import json
import re

typeRegex = r"(convenience)|(department_store)|(hypermarket)|(^shop)|(pharmacy)|(discount)|(cafe)|(delivery)|(food)|(medical)|(grocery)|(bakery)|(hospital)|(^supermarket)|(health)|(doctor)|(grocers)"
r = redis.Redis(host='localhost', port=6379, db=2)
rPersistence = redis.Redis(host='localhost', port=6379, db=3)

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


while True:
	pack = r.blpop(['queue:places'], 10)
	if not pack:
		continue

	try:
		placeKey = pack[1].decode()
		place = getPlaceFromRedis(placeKey)
		item = {
			"place_id": place["place_id"],
			"formatted_address": place["address"],
			"name": place["name"],
			"types": place["types"],
			"place_types": place["place_types"],
			"geometry": {
				"location": {
					"lat": place["coordinates"]["lat"],
					"lng": place["coordinates"]["lng"]
				}
			}
		}
		result = waitingtimes.get_by_fulldetail(item)
		if (isAdmittedPlace(result)):
			print("Saving " + result["place_id"])
			setKeyRedis(result["place_id"], json.dumps(result), 60*15)
			setKeyRedis(result["place_id"], json.dumps(result))
			if ("populartimes" in result):
				geoAddKeyRedis(result["place_id"], result["coordinates"]["lat"], result["coordinates"]["lng"])
	except Exception as e:
		print(e)
		time.sleep(40)
