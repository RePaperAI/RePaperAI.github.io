from scanner import analyze_image
from PIL import Image


def test_blank_document_is_usable():
    result = analyze_image(Image.new("RGB", (100, 140), "white"))
    assert result["type"] == "blank"
    assert result["blank"] > 98


def test_marked_document_is_detected():
    image = Image.new("RGB", (100, 140), "white")
    pixels = image.load()
    for y in range(25, 100, 15):
        for x in range(15, 85):
            pixels[x, y] = (30, 30, 30)
    result = analyze_image(image)
    assert result["printed"] > 5
