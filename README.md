# RePaper AI

Dependency-free browser prototype for an intelligent paper reuse system.

Open `index.html`, upload a paper image or use the sample, adjust school demand, and print the proposed layout.

The scanner reads uploaded pixels through a browser canvas and computes deterministic blank, marked, and edge-damage estimates in `scanner.js`. It also labels scans as blank, printed, handwritten, or damaged. The lightweight heuristic is suitable for a prototype; a production pilot should replace it with a validated segmentation/model pipeline.

Run the fixture tests with `npm test`.

## Optional Python scanner

The browser wrapper in `python-wrapper.js` can call the Python implementation in `app.py`. Install dependencies with `pip install -r requirements.txt`, run `python app.py`, and open `http://127.0.0.1:5000/scanner.html`.

## Run the Python version

Install Python dependencies with `pip install -r requirements.txt`, then start the server with `python app.py`. Open `http://127.0.0.1:5000`; the Python endpoint accepts image uploads at `POST /api/analyze`.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then click **Save**.

GitHub Pages will publish `index.html` as the site home. The site is static and uses relative asset paths, so no build step or server is required.

Recommended next steps: collect and label real school images; train/test a segmentation model; convert masks to polygons; use a nesting algorithm for A5, memo, or flashcard templates; score `recovered_area × demand − cutting_waste − handling_cost`; validate manually before connecting a guarded cutter; store aggregate metrics rather than student worksheet images by default.
