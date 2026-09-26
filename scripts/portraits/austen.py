from dsl import catmull, curls
from parts import framed
def draw():
    # A soft cap over the hair, its frilled edge round the face.
    outer = [(58, 128), (52, 108), (50, 86), (58, 62), (78, 46), (100, 40), (122, 46), (142, 62), (150, 86),
             (148, 108), (142, 128), (138, 132)]
    inner = curls([(136, 120), (138, 96), (130, 76), (112, 64), (100, 62), (88, 64), (70, 76), (62, 96),
                   (64, 118)], 14, 3) + [(66, 110)] + curls([(70, 100), (86, 84), (100, 80), (114, 84)], 4, 3) + [
        (100, 88), (80, 96), (69, 112)]
    return catmull(framed(outer, inner, "plain", "plain", lips=10), 8)
