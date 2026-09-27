from dsl import catmull
from parts import framed, hair_short, INNER_FRINGE


def draw():
    return catmull(framed(hair_short()[0], INNER_FRINGE, "plain", "plain", lips=12), 8)
