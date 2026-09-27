from dsl import catmull
from parts import framed, hair_cloche


def draw():
    return catmull(framed(*hair_cloche(), "plain", "plain", lips=12), 8)
