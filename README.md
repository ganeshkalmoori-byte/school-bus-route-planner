# School Bus Route Planner (Problem 32 / DAA prototype)

Dependency-free HTML, CSS and JavaScript (ES modules). Models a school neighbourhood as a weighted graph,
finds road paths with Dijkstra and BFS, and assigns pickup groups to buses with a greedy strategy.

## Files
- `index.html` – page shell
- `app.js` – UI
- `engine.mjs` – algorithms (Dijkstra, BFS, greedy planner, validation)
- `styles.css` – styling
- `tests.mjs` – automated checks (`node tests.mjs`)

## Run locally
ES modules need a web server (not file://):

    python3 -m http.server 8000

Then open http://localhost:8000

## Host on GitHub Pages
Settings → Pages → Deploy from branch → `main` / root.

## Notes
Greedy heuristics; no guarantee of a globally optimal solution. Synthetic data only.
