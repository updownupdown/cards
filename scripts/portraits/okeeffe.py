from dsl import catmull
from parts import framed, hair_updo


def draw():
    return catmull(framed(*hair_updo(), "robe", "robe", lips=9), 8)
