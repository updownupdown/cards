from dsl import catmull
from parts import framed, hair_short


def draw():
    return catmull(framed(*hair_short(curly=True), "plain", "plain", lips=11, glasses="round"), 8)
