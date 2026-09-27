from dsl import catmull
from parts import framed, hair_short


def draw():
    return catmull(framed(*hair_short(curly=True), "robe", "robe", lips=13), 8)
