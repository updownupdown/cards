from dsl import catmull
from parts import framed, hair_down


def draw():
    return catmull(framed(*hair_down(bottom=150, spread=8), "plain", "lace", lips=10), 8)
