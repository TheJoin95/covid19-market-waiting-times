from flask import Flask
from markupsafe import escape
import populartimes

app = Flask(__name__)

# populartimes.get(api_key, types, bound_lower, bound_upper, n_threads (opt), radius (opt), all_places (opt))

# api_key str; api key from google places web service; e.g. "your-api-key"
# types [str]; placetypes; see https://developers.google.com/places/supported_types; e.g. ["bar"]
# p1 (float, float); lat/lng of point delimiting the search area; e.g. (48.132986, 11.566126)
# p2 (float, float); lat/lng of point delimiting the search area; e.g. (48.142199, 11.580047)
# n_threads (opt) int; number of threads used; e.g. 20
# radius (opt) int; meters; up to 50,000 for radar search; e.g. 180; this has can be adapted for very dense areas
# all_places (opt) bool; include/exclude places without populartimes

print(populartimes.get('ChIJSYuuSx9awokRyrrOFTGg0GY', ['supermarket', 'bar'], (43.8262343,11.1301156), (43.8234918,11.1239334)))
raise

@app.route('/user/<username>')
def show_user_profile(username):
    # show the user profile for that user
    return 'User %s' % escape(username)

@app.route('/post/<int:post_id>')
def show_post(post_id):
    # show the post with the given id, the id is an integer
    return 'Post %d' % post_id

@app.route('/path/<path:subpath>')
def show_subpath(subpath):
    # show the subpath after /path/
    return 'Subpath %s' % escape(subpath)

@app.route('/')
def hello_world():
    return 'Hello, World!'