"""Turns an outline font into a single-line ("pen") SVG font.

    python3 scripts/skeletonize-pen-font.py <font.ttf> <out.svg> "<Family>" "<Credit>"

The credit (the source font's copyright line) goes into the SVG's metadata.
Mind Reserved Font Names: an OFL font with one (Sacramento) must not lend
its name to the traced version.

Needs Pillow, NumPy, fontTools and scikit-image (a throwaway venv is fine):
    python3 -m venv /tmp/pen && /tmp/pen/bin/pip install pillow numpy fonttools scikit-image

Each glyph is rendered large, thinned to its centre line, and traced into
strokes a pen can follow: from the leftmost free end, going straight on at
every crossing. Works best on monoline scripts (Sacramento, Oooh Baby), whose
centre line is the letter. The output is the same SVG-font format as the EMS
fonts, so scripts/generate-pen-font.mjs reads either.
"""

import sys

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import label
from skimage.morphology import skeletonize

EM_PX = 512  # rendering size; 1 px = 1000 / EM_PX font units
UNITS = 1000 / EM_PX

# Latin letters most languages need; anything else is composed at build time.
CHARSET = (
    [chr(c) for c in range(0x20, 0x7F)]
    + [chr(c) for c in range(0xA0, 0x180)]
    + list("‘’“”–—…˘ˇ˙˚˛˝")
)

NEIGHBOURS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def render(font, char):
    """Binary image of one glyph, and where its origin (left, baseline) sits."""
    pad = EM_PX
    width = int(font.getlength(char)) + pad * 2
    height = EM_PX * 2
    baseline = int(EM_PX * 1.25)
    image = Image.new("L", (width, height), 0)
    ImageDraw.Draw(image).text((pad, baseline), char, font=font, fill=255, anchor="ls")
    return np.array(image) > 127, pad, baseline


def trace(skeleton):
    """Skeleton pixels -> graph edges (pixel paths between ends and crossings)."""
    points = set(zip(*np.nonzero(skeleton)))

    def neighbours(p):
        return [(p[0] + dy, p[1] + dx) for dy, dx in NEIGHBOURS if (p[0] + dy, p[1] + dx) in points]

    degree = {p: len(neighbours(p)) for p in points}
    nodes = {p for p in points if degree[p] != 2}
    edges = []
    used = set()  # (a, b) pixel steps already walked

    def walk(start, first):
        path = [start, first]
        used.add((start, first))
        used.add((first, start))
        previous, current = start, first
        while current not in nodes:
            options = [n for n in neighbours(current) if n != previous and (current, n) not in used]
            if not options:
                break
            # Prefer 4-connected steps, so diagonals don't short-cut corners.
            options.sort(key=lambda n: abs(n[0] - current[0]) + abs(n[1] - current[1]))
            nxt = options[0]
            used.add((current, nxt))
            used.add((nxt, current))
            path.append(nxt)
            previous, current = current, nxt
            if current == start:
                break
        return path

    for node in nodes:
        for n in neighbours(node):
            if (node, n) not in used:
                edges.append(walk(node, n))
    # Closed loops with no ends or crossings.
    for p in points:
        if p in nodes:
            continue
        for n in neighbours(p):
            if (p, n) not in used:
                nodes.add(p)
                edges.append(walk(p, n))
                break
    return [e for e in edges if len(e) > 1], degree


def merge_close_nodes(edges, radius=3):
    """Crossings come out as clusters of pixels; treat each as one node."""
    ends = [e[0] for e in edges] + [e[-1] for e in edges]
    rep = {}
    for p in ends:
        if p in rep:
            continue
        rep[p] = p
        for q in ends:
            if q not in rep and abs(q[0] - p[0]) <= radius and abs(q[1] - p[1]) <= radius:
                rep[q] = p
    return rep


def direction(path, at_start, span=12):
    """Unit direction leaving the path's start (or arriving at its end)."""
    if at_start:
        a, b = path[0], path[min(span, len(path) - 1)]
    else:
        a, b = path[max(0, len(path) - 1 - span)], path[-1]
    v = np.array([b[1] - a[1], b[0] - a[0]], dtype=float)
    n = np.linalg.norm(v)
    return v / n if n else v


def assemble(edges, stroke_px):
    rep = merge_close_nodes(edges)
    edges = [[rep.get(e[0], e[0])] + e[1:-1] + [rep.get(e[-1], e[-1])] for e in edges]
    count = {}
    for e in edges:
        for end in (e[0], e[-1]):
            count[end] = count.get(end, 0) + 1
    # Drop short spurs: a free end hanging off a crossing.
    edges = [
        e
        for e in edges
        if not (
            len(e) < stroke_px * 0.9
            and ((count[e[0]] == 1 and count[e[-1]] >= 3) or (count[e[-1]] == 1 and count[e[0]] >= 3))
        )
    ]
    remaining = list(range(len(edges)))
    strokes = []
    while remaining:
        # Start from the leftmost free end, else the leftmost point.
        count = {}
        for i in remaining:
            for end in (edges[i][0], edges[i][-1]):
                count[end] = count.get(end, 0) + 1
        best = None
        for i in remaining:
            for at_start in (True, False):
                end = edges[i][0] if at_start else edges[i][-1]
                key = (count[end] != 1, end[1])
                if best is None or key < best[0]:
                    best = (key, i, at_start)
        _, i, at_start = best
        path = edges[i] if at_start else edges[i][::-1]
        remaining.remove(i)
        stroke = list(path)
        while True:
            end = stroke[-1]
            heading = direction(stroke, False)
            choice = None
            for j in remaining:
                for forward in (True, False):
                    candidate = edges[j] if forward else edges[j][::-1]
                    if candidate[0] != end:
                        continue
                    turn = float(np.dot(heading, direction(candidate, True)))
                    if choice is None or turn > choice[0]:
                        choice = (turn, j, candidate)
            # Carry on through a crossing only if the line runs on smoothly.
            if choice is None or choice[0] < -0.2:
                break
            remaining.remove(choice[1])
            stroke.extend(choice[2][1:])
        strokes.append(stroke)
    return strokes


def smooth(stroke, window=5):
    pts = np.array([[p[1], p[0]] for p in stroke], dtype=float)
    if len(pts) < window * 2:
        return pts
    closed = np.allclose(pts[0], pts[-1])
    out = pts.copy()
    half = window // 2
    for i in range(len(pts)):
        if not closed and (i < half or i >= len(pts) - half):
            continue
        idx = [(i + k) % len(pts) for k in range(-half, half + 1)]
        out[i] = pts[idx].mean(axis=0)
    return out


def simplify(pts, tolerance):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    length = np.hypot(*ab)
    if length == 0:
        d = np.hypot(*(pts - a).T)
    else:
        rel = pts - a
        d = np.abs(ab[0] * rel[:, 1] - ab[1] * rel[:, 0]) / length
    i = int(np.argmax(d))
    if d[i] <= tolerance:
        return np.array([a, b])
    return np.vstack([simplify(pts[: i + 1], tolerance)[:-1], simplify(pts[i:], tolerance)])


def stroke_width(font):
    """Typical stroke thickness in px, from the letter 'l'."""
    mask, _, _ = render(font, "l")
    rows = [row.sum() for row in mask if row.any()]
    return float(np.median(rows)) if rows else 20.0


def main(src, out, family, credit=""):
    font = ImageFont.truetype(src, EM_PX)
    cmap = TTFont(src).getBestCmap()
    thickness = stroke_width(font)
    glyphs = []
    for char in CHARSET:
        if ord(char) not in cmap:
            continue
        advance = font.getlength(char) * UNITS
        mask, origin_x, baseline = render(font, char)
        d = ""
        labels, count = label(mask, structure=np.ones((3, 3)))
        # Left to right, one connected piece of ink at a time.
        pieces = sorted(range(1, count + 1), key=lambda k: np.nonzero(labels == k)[1].min())
        for k in pieces:
            piece = labels == k
            strokes = [simplify(smooth(s), 1.0) for s in assemble(trace(skeletonize(piece))[0], thickness)]
            drawn = sum(np.hypot(*np.diff(s, axis=0).T).sum() for s in strokes if len(s) > 1)
            ys, xs = np.nonzero(piece)
            size = max(xs.max() - xs.min(), ys.max() - ys.min()) + 1
            if drawn < size * 0.8:
                # A dot thins away to almost nothing: dab it with a short stroke.
                cx, cy, r = xs.mean(), ys.mean(), size * 0.3
                strokes = [np.array([[cx - r * 0.7, cy + r * 0.4], [cx + r * 0.7, cy - r * 0.4]])]
            for pts in strokes:
                if len(pts) < 2:
                    continue
                coords = [
                    f"{(x - origin_x) * UNITS:.0f} {(baseline - y) * UNITS:.0f}" for x, y in pts
                ]
                d += "M " + " L ".join(coords) + " "
        glyphs.append((char, advance, d.strip()))

    def escape(c):
        return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}.get(c, c)

    lines = [
        '<?xml version="1.0" encoding="UTF-8" ?>',
        '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">',
        "<metadata>",
        f"{family}: single-line font traced by scripts/skeletonize-pen-font.py",
        f"Derived from: {credit}",
        "License: SIL Open Font License 1.1 (see OFL.txt)",
        "</metadata>",
        f'<defs><font id="{family.replace(" ", "")}" horiz-adv-x="300">',
        f'<font-face font-family="{family}" units-per-em="1000" ascent="800" descent="-200" />',
    ]
    for char, advance, d in glyphs:
        attrs = f'unicode="{escape(char)}" horiz-adv-x="{advance:.0f}"'
        lines.append(f"<glyph {attrs} d=\"{d}\" />" if d else f"<glyph {attrs} />")
    lines += ["</font></defs>", "</svg>"]
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"{out}: {len(glyphs)} glyphs, stroke {thickness:.0f}px")


if __name__ == "__main__":
    main(*sys.argv[1:5])
