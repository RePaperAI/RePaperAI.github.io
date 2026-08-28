"""RePaper AI Python server and image analyzer."""
import io
import json
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image, ImageOps

app = Flask(__name__, static_folder=".", static_url_path="")


def clamp(value, low=0, high=100):
    return max(low, min(high, value))


def percentile(values, fraction):
    values = sorted(values)
    return values[int((len(values) - 1) * fraction)]


def analyze_image(image):
    image = ImageOps.exif_transpose(image).convert("RGBA")
    width, height = image.size
    pixels = list(image.getdata())
    gray = []
    for red, green, blue, alpha in pixels:
        opacity = alpha / 255
        gray.append(round(255 * (1 - opacity) + (0.2126 * red + 0.7152 * green + 0.0722 * blue) * opacity))

    paper_tone = percentile(gray[::17] or gray, 0.85)
    threshold = min(235, max(150, paper_tone - 28))
    ink = [value < threshold for value in gray]
    marked = sum(ink) / len(ink) * 100

    edge_width = max(1, round(min(width, height) * 0.04))
    edge = []
    corner = []
    for y in range(height):
        for x in range(width):
            if x < edge_width or y < edge_width or x >= width - edge_width or y >= height - edge_width:
                edge.append(ink[y * width + x])
            if (x < edge_width * 3 or x >= width - edge_width * 3) and (y < edge_width * 3 or y >= height - edge_width * 3):
                corner.append(ink[y * width + x])
    edge_coverage = sum(edge) / max(1, len(edge))
    damage_score = clamp(edge_coverage * 180 + (sum(corner) / max(1, min(width, height) ** 2 * 0.003)) * 18)
    damage_area = min(marked, damage_score * 0.45)
    printed = max(0, marked - damage_area)
    blank = clamp(100 - printed - damage_area)

    active_rows = sum(sum(ink[y * width + 1:y * width + width - 1]) > width * 0.03 for y in range(1, height - 1))
    writing_spread = active_rows / max(1, height - 2)
    if marked < 1.5:
        kind = "blank"
    elif damage_score >= 35:
        kind = "damaged"
    elif writing_spread > 0.3:
        kind = "handwritten"
    else:
        kind = "printed"

    return {"blank": round(blank), "printed": round(printed), "damage": round(damage_area), "type": kind, "confidence": round(clamp(72 + abs(marked - 50) * 0.25 - (8 if kind == "damaged" else 0)))}


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
