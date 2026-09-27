"""Parts for the one-line portraits: every portrait is one line, face on, in a
200 x 240 box, from START (bottom left) to END (bottom right).

Most portraits follow one route, built from the parts below in this order:

    left_side()     START, left shoulder and clothes, up the neck, the left jaw
                    (or beard) and ear, to the left temple
    crown_*()       the head or hair over the top, back down to the right brow
    eyes_rl()       right brow, right eye, down and up the nose, left eye, left
                    brow (the mirror of face.eyes_and_nose)
    lower()         down the left cheek, mouth (moustache, beard...), chin, up
                    the right jaw
    right_side()    down the neck, right clothes and shoulder, to END

Portraits with hair framing the face follow the framed route instead (see
framed() and the hair_* parts, and keller.py). Draw a point twice to make a corner; see dsl.catmull.
"""

from dsl import curls, loop
from face import mirrored, mouth

START = (4, 238)
END = (196, 238)

# The right ear, then up to the right brow's outer end.
EAR_R = [(138, 106), (143, 110), (143, 122), (137, 128), (134, 116), (129, 105)]
NO_EAR_R = [(137, 98), (131, 104)]


def eyes(y=110, spread=16, cx=100, glasses=None, closed=False, heavy=False, lid=1.0):
    """Left brow's outer end to the right brow's outer end: brow, eye (open,
    or closed as a crescent), down the nose, nostrils, up, the other eye and
    brow. glasses: None, "round" or "square", drawn round each eye."""
    L = cx - spread
    R = cx + spread
    lift = 1.5 if heavy else 0
    p = [(L - 12, y - 5 - lift), (L - 4, y - 10 - lift), (L + 7, y - 8 - lift)]
    if heavy:
        p += [(L + 2, y - 9), (L + 7, y - 8), (L + 7, y - 8)]
    else:
        p += [(L + 7, y - 8)]
    if closed:
        p += [(L + 6, y), (L - 2, y + 3.5), (L - 10, y + 0.5), (L - 2, y + 2), (L + 6, y)]
    else:
        p += [(L + 6, y), (L + 1, y - 4 * lid), (L - 6, y - 3 * lid), (L - 11, y + 1),
              (L - 5, y + 4), (L + 2, y + 4), (L + 6, y + 1)]
        p += loop(L - 1.5, y + 0.5, 2.6, 0, 1.0, 10)
    if glasses:
        p += lens(L - 2, y + 1, glasses, side="left")
    p += [(cx - 5, y + 3), (cx - 4, y + 16), (cx - 5, y + 27), (cx - 8, y + 31), (cx - 6, y + 35),
          (cx - 1, y + 35), (cx + 1, y + 36), (cx + 4, y + 35), (cx + 8, y + 33), (cx + 5, y + 29)]
    p += [(cx + 4, y + 24), (cx + 4, y + 10), (R - 10, y + 2)]
    if closed:
        p += [(R - 10, y + 0.5), (R - 2, y + 3.5), (R + 6, y), (R - 2, y + 2), (R - 10, y + 1)]
    else:
        p += [(R - 4, y - 4 * lid), (R + 4, y - 4 * lid), (R + 10, y), (R + 4, y + 4),
              (R - 4, y + 4), (R - 10, y + 1)]
        p += loop(R + 0.5, y + 0.5, 2.6, 180, 1.0, 10)
    if glasses:
        p += lens(R + 2, y + 1, glasses, side="right")
    p += [(R - 6, y - 8 - lift), (R + 3, y - 11 - lift), (R + 12, y - 6 - lift), (R + 12, y - 6 - lift)]
    return p


def lens(cx, cy, shape, side):
    """A spectacle lens round an eye, entered and left on its nose side."""
    r = 11
    if shape == "round":
        start = 0 if side == "left" else 180
        return [(cx + (r if side == "left" else -r), cy)] + loop(cx, cy, r, start, 1.0, 16)
    # Square, with soft corners.
    x0, x1, y0, y1 = cx - r - 1, cx + r + 1, cy - r + 2, cy + r - 2
    if side == "left":
        return [(x1, cy), (x1, y0), (x1, y0), (x0, y0), (x0, y0), (x0, y1), (x0, y1),
                (x1, y1), (x1, y1), (x1, cy)]
    return [(x0, cy), (x0, y0), (x0, y0), (x1, y0), (x1, y0), (x1, y1), (x1, y1),
            (x0, y1), (x0, y1), (x0, cy)]


def there_and_back(points):
    """A detail drawn out and back along itself, so the line can return."""
    return points + [points[-1]] + points[::-1][1:]


def eyes_rl(**options):
    return mirrored(eyes(**options))


# --- Left side -------------------------------------------------------------------

CLOTHES_LEFT = {
    "plain": [(20, 228), (46, 216), (70, 208), (80, 202)],
    "suit": [(24, 226), (54, 212), (72, 206), (88, 226), (88, 226), (78, 204), (82, 198)],
    "robe": [(22, 228), (48, 214), (68, 206), (78, 202)],
    "high": [(20, 228), (48, 214), (70, 206), (78, 198), (74, 190), (74, 190), (84, 190)],
}


def left_side(clothes="plain", ear=True, long_ear=False, beard=None, tuft=False, neck=84):
    """START to the left temple. beard: None, "curly" or "wavy" (its left
    edge stands in for the jaw)."""
    p = [START] + CLOTHES_LEFT[clothes]
    if beard:
        p += [(neck - 2, 200)]
        guide = [(72, 206), (64, 184), (61, 160), (62, 140), (64, 128)]
        p += curls(guide, 6, 3.5) if beard == "curly" else waves(guide, 5, 2.5)
    else:
        p += [(neck, 190), (neck, 180), (78, 172), (70, 156), (66, 138), (64, 128)]
    if long_ear:
        p += [(60, 132), (56, 140), (52, 134), (54, 116), (58, 106), (63, 106), (65, 112)]
    elif ear:
        p += [(60, 126), (56, 118), (57, 108), (62, 106), (65, 112)]
    if tuft:
        p += [(60, 104), (55, 108), (54, 96), (60, 88), (64, 92)]
    return p + [(64, 104)]


def waves(guide, count, amplitude):
    """A gently wavy line along a guide (straight hair, a trimmed beard)."""
    from dsl import catmull
    import math

    g = catmull(guide, 20)
    out = []
    for i, (x, y) in enumerate(g):
        j = min(i + 1, len(g) - 1)
        k = max(i - 1, 0)
        dx, dy = g[j][0] - g[k][0], g[j][1] - g[k][1]
        n = math.hypot(dx, dy) or 1
        s = math.sin(2 * math.pi * count * i / (len(g) - 1)) * amplitude
        out.append((x - dy / n * s, y + dx / n * s))
    return out[::3] + [out[-1]]


# --- Crowns (left temple to right brow) -----------------------------------------------

def crown_dome(ear=True):
    """A bald head."""
    return [(62, 90), (64, 72), (74, 55), (92, 46), (112, 46), (128, 55), (136, 72), (138, 92)] + (
        EAR_R if ear else NO_EAR_R
    )


def crown_bald_sides(ear=True):
    """Bald on top, a tuft over each ear."""
    return (
        [(62, 90), (64, 72), (74, 55), (92, 46), (112, 46), (128, 55), (136, 72), (138, 88)]
        + [(142, 90), (146, 100), (143, 110), (138, 104)]
        + (EAR_R if ear else NO_EAR_R)
    )


def crown_short(part=True, ear=True, height=0):
    """Short hair, with a side parting and the hairline across the forehead
    (drawn there and back from the right temple)."""
    h = height
    p = [(62, 92), (62, 74 - h), (70, 58 - h), (84, 48 - h)]
    if part:
        p += [(82, 58 - h), (78, 72), (82, 60 - h), (90, 47 - h)]
    p += [(100, 45 - h), (116, 46 - h), (130, 54 - h), (137, 70 - h), (138, 90)]
    return p + there_and_back([(130, 80), (116, 74), (98, 73), (82, 77)]) + [(137, 94)] + (
        EAR_R if ear else NO_EAR_R
    )


def crown_swept(ear=True, volume=0):
    """Hair swept up and back in a wave, with its front edge."""
    v = volume
    p = [(62, 90), (60, 70 - v), (68, 52 - v), (84, 40 - v), (104, 36 - v), (124, 40 - v),
         (138, 52 - v), (142, 70 - v), (139, 92)]
    return p + there_and_back([(134, 74), (122, 66), (104, 64), (88, 70), (80, 80)]) + [(137, 96)] + (
        EAR_R if ear else NO_EAR_R
    )


def crown_curls(count=11, radius=7, ear=False):
    """Curls all round."""
    return (
        curls([(62, 138), (58, 110), (64, 82), (80, 62), (100, 56), (120, 62), (136, 82), (142, 110), (138, 136)],
              count, radius)
        + [(134, 122), (130, 108)]
        + (EAR_R if ear else [])
    )


def crown_curly_cap(count=12, radius=5):
    """Short curly hair, close to the head."""
    return (
        curls([(62, 100), (62, 76), (74, 58), (100, 50), (126, 58), (138, 76), (138, 100)], count, radius)
        + EAR_R
    )


def crown_shaved():
    """Shaved or close-cropped, the ears standing out."""
    return [(62, 94), (63, 74), (72, 58), (90, 49), (110, 49), (128, 58), (137, 74), (138, 96)] + [
        (140, 104), (146, 108), (147, 124), (139, 132), (134, 118), (129, 105)
    ]


def crown_topknot():
    """Hair drawn up into a knot on top, with a pin through it."""
    return [(62, 92), (63, 72), (72, 56), (88, 48), (94, 46), (90, 36), (94, 26), (106, 26), (110, 36),
            (106, 46), (106, 46), (84, 32), (84, 32), (124, 36), (124, 36), (106, 46), (116, 48),
            (128, 56), (137, 72), (138, 92)] + EAR_R


def crown_ushnisha():
    """The Buddha's curls and the rounded knot of wisdom on top."""
    return (
        curls([(64, 96), (66, 72), (84, 56), (100, 52), (116, 56), (134, 72), (136, 96)], 12, 3.5)
        + [(122, 58), (116, 44), (100, 36), (84, 44), (78, 58), (80, 58)]
        + curls([(84, 54), (100, 44), (116, 54)], 4, 3)
        + [(120, 60), (136, 84), (138, 96)]
        + [(142, 104), (146, 118), (146, 140), (142, 150), (136, 144), (138, 124), (134, 114), (129, 105)]
    )


def crown_mane(volume=10):
    """A big swept-back mane (Frederick Douglass)."""
    v = volume
    return (
        [(60, 96)]
        + waves([(56, 90), (50, 70 - v / 2), (58, 50 - v), (78, 36 - v), (100, 30 - v), (124, 34 - v),
                 (144, 50 - v), (152, 72 - v / 2), (146, 96)], 9, 3)
        + there_and_back([(136, 84), (124, 76), (108, 74), (92, 76), (78, 84)])
        + [(138, 98)]
        + EAR_R
    )


def crown_messy(volume=6):
    """Thick, unruly hair standing up all over."""
    v = volume
    return (
        [(62, 92)]
        + waves([(60, 86), (54, 66 - v / 2), (62, 48 - v), (82, 36 - v), (102, 32 - v), (124, 36 - v),
                 (142, 50 - v), (148, 70 - v / 2), (140, 92)], 7, 3)
        + [(137, 96)]
        + EAR_R
    )


def crown_wisps():
    """Thin, unruly hair (the pseudo-Seneca bust)."""
    return (
        [(62, 90), (58, 74), (63, 64), (60, 56), (70, 58), (74, 49), (84, 53), (92, 45), (100, 51),
         (108, 45), (115, 52), (124, 49), (127, 58), (136, 58), (135, 67), (142, 72), (139, 92)]
        + EAR_R
    )


# --- Lower face (left brow to right jaw) -----------------------------------------------

def cheek_left():
    return [(69, 118), (71, 136)]


def lower_lips(w=11, y=158):
    """Lips and chin, clean-shaven."""
    return (
        cheek_left()
        + [(76, 148), (86, y)]
        + mouth(y, w=w)
        + [(108, 166), (100, 176), (92, 175), (92, 175), (104, 180), (118, 175), (128, 160), (134, 140), (134, 140)]
    )


def lower_smile(y=152):
    """A wide, open smile."""
    return cheek_left() + [
        (80, y), (80, y), (90, y + 3), (100, y + 4), (110, y + 3), (120, y), (120, y),
        (112, y + 9), (100, y + 13), (88, y + 9), (80, y), (80, y),
        (86, y + 16), (100, y + 26), (116, y + 20), (128, y + 6), (134, 140), (134, 140),
    ]


def moustache(y=150, droop=0, width=20):
    """Right to left under the nose: the mouth sits below it."""
    return [(100 + width, y + droop), (110, y - 3), (100, y), (90, y - 3), (100 - width, y + droop)]


def lower_moustache(droop=2):
    """A moustache over the lower lip; clean-shaven chin."""
    return cheek_left() + [(76, 146), (80, 150)] + mirrored(moustache(droop=droop)) + [
        (116, 156), (108, 160), (100, 161), (92, 160), (92, 160), (100, 164), (108, 162),
        (110, 170), (100, 177), (92, 175), (92, 175), (104, 180), (118, 175), (128, 160), (134, 140),
        (134, 140),
    ]


def lower_goatee(length=196):
    """Moustache, lower lip and a pointed goatee."""
    return cheek_left() + [(76, 146), (80, 150)] + mirrored(moustache(droop=4)) + [
        (116, 156), (106, 160), (94, 160), (94, 160), (96, 172), (100, length), (104, 172),
        (106, 162), (106, 162), (118, 172), (128, 158), (134, 140), (134, 140),
    ]


def lower_beard(style="curly", bottom=200, width=30, point=False):
    """Moustache, then a full beard round the chin, up to the right cheek."""
    top = [(76, 146), (80, 150)] + mirrored(moustache(droop=3, width=21)) + [
        (114, 158), (100, 160), (88, 158), (88, 158), (92, 164)
    ]
    b = bottom
    guide = [(100 - width, 152), (100 - width + 4, b - 26), (100 - 8, b - 4),
             (100, b + (12 if point else 0)), (108, b - 4), (100 + width - 4, b - 26),
             (100 + width, 152), (132, 140)]
    edge = curls(guide, 9, 4) if style == "curly" else waves(guide, 8, 2.2)
    return cheek_left() + top + [(100 - width, 150)] + edge + [(134, 140), (134, 140)]


def lower_neck_beard():
    """Clean-shaven face, a beard fringe under the jaw (Thoreau)."""
    return lower_lips()[:-6] + [
        (92, 175), (92, 175), (80, 176), (74, 170),
    ] + waves([(72, 170), (78, 188), (100, 196), (122, 188), (128, 170)], 6, 2.5) + [
        (130, 160), (134, 140), (134, 140)
    ]


def lower_wispy():
    """A long thin moustache and a wisp of beard (Zhuangzi)."""
    return cheek_left() + [(78, 150), (78, 150), (72, 164), (70, 176), (72, 164), (84, 152), (92, 150),
                           (100, 152), (108, 150), (116, 152), (128, 164), (130, 176), (128, 164),
                           (122, 152), (110, 158), (100, 160), (90, 158), (90, 158), (96, 166),
                           (100, 190), (102, 206), (104, 190), (106, 166), (106, 166), (118, 170),
                           (128, 158), (134, 140), (134, 140)]


def lower_pipe():
    """Lips, and a pipe held at the right corner of the mouth."""
    lips = lower_lips()
    corner = len(lips) - 1 - lips[::-1].index((111, 158))
    return lips[: corner + 1] + [
        (120, 163), (130, 167), (130, 167), (129, 178), (134, 184), (142, 182), (144, 170),
        (144, 170), (130, 170), (130, 170), (120, 165), (111, 160),
    ] + lips[corner + 1:]


# --- Right side (right jaw to END) -------------------------------------------------------

NECK_R = [(126, 166), (119, 182), (118, 196)]


def right_side(clothes="plain"):
    if clothes == "plain":
        return NECK_R + [(122, 202), (140, 208), (166, 216), (186, 226), END]
    if clothes == "suit":
        return NECK_R + [(124, 200), (120, 214), (120, 214), (126, 206), (148, 210), (172, 220), (190, 230), END]
    if clothes == "tie":
        return NECK_R + [
            (124, 200), (120, 212), (120, 212), (106, 204), (100, 206), (94, 204), (97, 212),
            (94, 236), (94, 236), (104, 236), (103, 212), (103, 212), (116, 212), (140, 208),
            (166, 216), (186, 226), END,
        ]
    if clothes in ("bowtie", "high"):
        collar = [(124, 188), (124, 188), (124, 198)] if clothes == "high" else []
        return NECK_R + collar + [
            (108, 199), (100, 200), (100, 200), (116, 192), (116, 192), (116, 208), (116, 208),
            (100, 200), (100, 200), (84, 192), (84, 192), (84, 208), (84, 208), (100, 200), (100, 200),
            (122, 205), (146, 210), (170, 218), (188, 228), END,
        ]
    if clothes == "turtleneck":
        return NECK_R + [
            (120, 186), (100, 188), (82, 188), (82, 188), (82, 198), (100, 199), (120, 198),
            (120, 198), (124, 204), (116, 236), (116, 236), (134, 206), (158, 212), (180, 222), END,
        ]
    if clothes == "robe":
        return NECK_R + [
            (118, 196), (106, 216), (96, 236), (96, 236), (106, 234), (116, 214), (128, 202),
            (150, 210), (174, 220), (190, 230), END,
        ]
    if clothes == "ruff":
        return [(126, 166), (120, 180), (120, 184)] + curls(
            [(142, 188), (124, 204), (100, 210), (76, 204), (58, 188)], 10, 4.5
        ) + [(60, 186), (78, 190), (100, 193), (122, 190), (140, 186), (146, 192), (164, 214), (184, 226), END]
    if clothes == "lace":
        return NECK_R + [(118, 198)] + curls(
            [(122, 200), (112, 212), (100, 216), (88, 212), (78, 200)], 7, 2.5
        ) + [(88, 206), (100, 209), (112, 206), (124, 202), (146, 210), (170, 218), (188, 228), END]
    if clothes == "flower":
        return NECK_R + [
            (124, 200), (120, 214), (120, 214), (126, 206), (138, 208),
        ] + loop(142, 214, 4, 180, 1.0, 10) + loop(146, 212, 3, 200, 1.0, 8) + [
            (140, 210), (150, 210), (172, 220), (190, 230), END,
        ]
    raise ValueError(clothes)


# --- Framed by hair (the framed route) -----------------------------------------------------


# Hair for framed(): (outer, inner). Inner edges: centre-parted, a fringe, swept.
INNER_PARTED = [(134, 118), (130, 96), (120, 78), (106, 70), (100, 69), (94, 70), (80, 78), (71, 96),
                (69, 112)]
INNER_FRINGE = [(136, 118), (136, 98), (126, 90), (112, 93), (100, 90), (88, 93), (74, 90), (65, 98), (66, 112)]
INNER_SWEPT = [(134, 116), (128, 92), (112, 84), (90, 86), (74, 94), (68, 112)]


def hair_down(bottom=160, spread=12, fringe=False, wave=0):
    """Straight or wavy hair falling past the jaw: a bob at 150-165, long hair
    at 180 and over."""
    lo, hi = 56 - spread, 144 + spread
    guide = [(lo + 4, bottom - 14), (lo, 110), (lo + 6, 80), (66, 58), (84, 46), (100, 43),
             (116, 46), (134, 58), (hi - 6, 80), (hi, 110), (hi - 4, bottom - 14)]
    top = waves(guide, 7, wave) if wave else guide
    outer = [(58, 132), (lo + 8, bottom - 6), (lo + 2, bottom), (lo + 2, bottom)] + top + [
        (hi - 2, bottom), (hi - 2, bottom), (hi - 8, bottom - 6), (142, 132), (138, 132), (138, 132)]
    return outer, INNER_FRINGE if fringe else INNER_PARTED


def hair_short(curly=False, swept=True):
    """Short hair close to the head."""
    guide = [(58, 128), (52, 104), (56, 78), (70, 58), (100, 48), (130, 58), (144, 78), (148, 104),
             (142, 128)]
    top = curls(guide, 12, 4.5) if curly else waves(guide, 6, 1.5)
    return top + [(136, 132), (136, 132)], INNER_SWEPT if swept else INNER_PARTED


def hair_updo(bun=False):
    """Hair drawn back from the face, with or without a bun on top."""
    left = waves([(60, 128), (56, 106), (58, 86), (68, 68), (86, 54)], 4, 1.2)
    right = waves([(114, 54), (130, 64), (140, 80), (144, 104), (140, 128)], 4, 1.2)
    top = [(92, 50), (90, 40), (96, 32), (104, 32), (110, 40), (108, 50), (108, 50), (92, 50), (92, 50)] if bun \
        else [(100, 50)]
    inner = [(134, 116), (130, 92), (118, 76), (100, 72), (82, 76), (70, 92), (68, 112)]
    return left + top + right + [(136, 132), (136, 132)], inner


def hair_big():
    """Big, teased and curled hair."""
    outer = curls([(58, 132), (40, 112), (34, 82), (48, 52), (76, 32), (100, 28), (124, 32), (152, 52),
                   (166, 82), (160, 112), (142, 132)], 13, 7) + [(138, 134), (138, 134)]
    inner = waves([(134, 118), (132, 94), (120, 80), (100, 76), (84, 80), (72, 94), (68, 112)], 4, 2)
    return outer, inner


def hair_cloche():
    """A close-fitting hat with a small brim, low over the brow."""
    outer = [(58, 128), (56, 110), (48, 102), (46, 96), (56, 92), (58, 72), (72, 52), (100, 42), (128, 52),
             (142, 72), (144, 92), (154, 96), (152, 102), (144, 110), (142, 128), (138, 132), (138, 132)]
    inner = [(134, 112), (128, 100), (100, 98), (72, 100), (69, 112)]
    return outer, inner


def framed(outer, inner, clothes_left="plain", clothes_right="plain", lips=11, glasses=None):
    """Hair that frames the face: up the left jaw to the ear, the hair's outer
    edge over the top and down to the right, its inner edge back across the
    forehead, the eyes left to right, then the right cheek, chin, lips, and
    down the neck. outer runs from the left ear to the right jaw; inner from
    there back to the left temple."""
    return (
        [START] + CLOTHES_LEFT[clothes_left]
        + [(83, 196), (84, 186), (84, 178), (78, 170), (71, 156), (67, 140), (65, 130)]
        + outer + inner + eyes(glasses=glasses)
        + [(131, 120), (130, 140), (123, 160), (112, 172), (100, 177), (92, 175), (92, 175),
           (94, 168), (92, 163)]
        + mouth(158, w=lips)
        + [(114, 166), (118, 180)]
        + right_side(clothes_right)[2:]
    )
