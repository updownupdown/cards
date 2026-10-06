from dsl import catmull
from parts import framed, hair_cloche

# A turban wrapped close round the head.


def draw():
    return catmull(framed(*hair_cloche(), "high", "high", lips=9), 8)
