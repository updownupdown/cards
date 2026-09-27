from dsl import catmull
from parts import framed, hair_big


def draw():
    return catmull(framed(*hair_big(), "plain", "lace", lips=12), 8)
