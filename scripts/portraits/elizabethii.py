from dsl import catmull
from parts import framed, hair_short


def draw():
    return catmull(framed(*hair_short(curly=True, swept=False), "plain", "lace", lips=10), 8)
