"""RePaper AI Python server and image analyzer."""
import io
import json
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image
from scanner import analyze_image

app = Flask(__name__, static_folder=".", static_url_path="")


@app.after_request
def allow_browser_scanner(response):
    """Allow the static preview page to submit images to this local API."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.get("/")
def home():
    return send_from_directory(".", "index.html")


@app.post("/api/analyze")
def analyze_endpoint():
    upload = request.files.get("image")
    if not upload or not upload.mimetype.startswith("image/"):
        return jsonify(error="An image upload is required"), 400
    try:
        result = analyze_image(Image.open(io.BytesIO(upload.read())))
        demand = json.loads(request.form.get("demand", "{}"))
        result["demand"] = demand
        return jsonify(result)
    except Exception as error:
        return jsonify(error=f"Could not analyze image: {error}"), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
