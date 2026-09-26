"""Draws portraits to a PNG, to check them while drawing.

    python3 scripts/portraits/preview.py                  all, in a grid
    python3 scripts/portraits/preview.py thoreau whitman  just these

Writes scripts/portraits/preview.png (git-ignored). Green marks the start of
the line (bottom left), red its end (bottom right). Needs Pillow.
"""

import importlib
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from export import AUTHORS  # noqa: E402

names = sys.argv[1:] or list(AUTHORS)
scale = 2 if len(names) > 4 else 3
columns = min(len(names), 8)
rows = (len(names) + columns - 1) // columns
cell_w, cell_h = 200 * scale, 260 * scale
image = Image.new("RGB", (cell_w * columns, cell_h * rows), (250, 250, 248))
draw = ImageDraw.Draw(image)
for index, name in enumerate(names):
    ox = (index % columns) * cell_w
    oy = (index // columns) * cell_h
    points = [(ox + x * scale, oy + y * scale) for x, y in importlib.import_module(name).draw()]
    draw.line(points, fill=(20, 20, 20), width=2, joint="curve")
    for (x, y), colour in ((points[0], "green"), (points[-1], "red")):
        draw.ellipse([x - 5, y - 5, x + 5, y + 5], fill=colour)
    draw.text((ox + 8, oy + 8), AUTHORS[name][0], fill=(200, 0, 0))
out = os.path.join(HERE, "preview.png")
image.save(out)
print(f"Wrote {os.path.relpath(out)}")
