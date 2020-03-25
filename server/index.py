from flask import Flask
from flask import jsonify
from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from markupsafe import escape
import waitingtimes

app = Flask(__name__)

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "100 per hour"]
)

# print(
# 	waitingtimes.get_places(
# 		{
#         "types": ["food-drink", "pharmacy", "post-office", "postal-area"],
#         "location": {
#             "lat": 43.33,
#             "lng": 11.23
#         },
#         "radius": 6000
#     }
# 	)
# )
# raise

# print(
# 	waitingtimes.get_by_fulldetail(
# 		{
# 				"accepted-place-type": ["bakery", "bank", "bar", "cafe", "doctor", "drugstore", "food", "health", "hospital", "meal_delivery", "meal_takeaway", "pharmacy", "post_office", "postal_code", "postal_town", "restaurant", "shopping_mall", "supermarket", "grocery_store", "discount_supermarket", "supermarket", "grocery"],
#         "place_id": "none",
#         "formatted_address": "",
#         "name": "Coop Campi Bisenzio",
#         "types": "Supermarket",
#         "geometry": {
#             "location": {
#                 "lat": 0,
#                 "lng": 0
#             }
#         }
#     }
# 	)
# )

# raise

@app.route('/places/explore', methods=["GET"])
def get_places():
	if (request.args.get('lng') == None or request.args.get('lat') == None):
		abort(400)

	places = waitingtimes.get_places({
    "types": ["food-drink", "pharmacy", "post-office", "postal-area"],
    "location": {
        "lat": request.args.get('lat'),
        "lng": request.args.get('lng')
    },
    "radius": 6000
  })

	formattedPlaces = []

	for x in range(0, len(places)-1):
		formattedPlaces.append(
			waitingtimes.get_by_fulldetail({
				"accepted_place_type": ["bakery", "bank", "bar", "cafe", "doctor", "drugstore", "food", "health", "hospital", "meal_delivery", "meal_takeaway", "pharmacy", "post_office", "postal_code", "postal_town", "restaurant", "shopping_mall", "supermarket", "grocery_store", "discount_supermarket", "supermarket", "grocery"],
		    "place_id": place["id"],
		    "formatted_address": place["vicinity"].replace("\n", " "),
		    "name": place["title"],
		    "types": place["category"]["id"],
		    "geometry": {
		        "location": {
		            "lat": place["position"][0],
		            "lng": place["position"][1]
		        }
		    }
			})
		)

	return jsonify(formattedPlaces)

if __name__ == '__main__':
	app.run()