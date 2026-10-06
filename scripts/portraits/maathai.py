from dsl import catmull
from parts import framed, hair_cloche

# A headwrap and a wide smile.


def draw():
    return catmull(framed(*hair_cloche(), "robe", "robe", lips=13), 8)
