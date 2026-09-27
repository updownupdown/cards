from dsl import catmull
from parts import framed, hair_updo


def draw():
    return catmull(framed(*hair_updo(bun=True), "high", "high", lips=10), 8)
