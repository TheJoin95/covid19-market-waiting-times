import redis
import time
import waitingtimes
import hashlib
import json
import re

typeRegex = r"(convenience)|(department_store)|(hypermarket)|(^shop)|(pharmacy)|(discount)|(cafe)|(delivery)|(food)|(medical)|(grocery)|(bakery)|(hospital)|(^supermarket)|(health)|(doctor)|(grocers)"
r = redis.Redis(host='51.178.53.247', port=6379, db=2)
rPersistence = redis.Redis(host='51.178.53.247', port=6379, db=3)
#print(r.get("a"))
def getPlaceFromRedis (key):
	global r, rPersistence
	place = r.get(key)
	if (place == None):
		place = rPersistence.get(key)

	if (place != None):
		place = json.loads(place.decode())

	return place

def pushInQueue (placeId):
	global r
	if (r.get('refresh:' + placeId) == None):
		r.rpush('queue:places', placeId)
		setKeyRedis('refresh:' + placeId, placeId, 60*10)


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


# worker

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
			with(open("/tmp/worker.log", "a")) as f:
				f.write("Saving " + result["place_id"] + "\n")
				f.close()
			setKeyRedis(result["place_id"], json.dumps(result), 60*15)
			setKeyRedis(result["place_id"], json.dumps(result))
			if ("populartimes" in result):
				geoAddKeyRedis(result["place_id"], result["coordinates"]["lat"], result["coordinates"]["lng"])

			QUERY_SEARCH = "{} near {} open now"

			q = "supermarket" # "pharmacy"
			address = place["address"] # porta nuova, milano

			try:
				places = waitingtimes.get_places_from_google(QUERY_SEARCH.format(q, address))
			except Exception as e:
				print(e)

			if (len(places) > 0):
				for place in places:
					if (place["name"] == None):
						continue

					place_id = hashlib.md5((str(place["name"])+str(place["address"])+str(place["location"]["lat"])+str(place["location"]["lng"])).encode("utf-8")).hexdigest()

					obj = {
						"place_id": place_id,
						"address": place["address"],
						"name": place["name"],
						"types": place["categories"],
						"place_types": place["place_types"],
						"coordinates": {
							"lat": place["location"]["lat"],
							"lng": place["location"]["lng"]
						}
					}

					if isAdmittedPlace(obj):
						setKeyRedis(obj["place_id"], json.dumps(obj), 60*15)
						pushInQueue(obj["place_id"])
						print("saving " + obj["place_id"])
						with(open("/tmp/worker-search-nearby.log", "a")) as f:
							f.write("Saving " + obj["place_id"] + "\n")
							f.close()
	except Exception as e:
		print(e)
		time.sleep(60)
