from dsl import catmull
from parts import framed, hair_down


def draw():
    return catmull(framed(*hair_down(bottom=178, spread=10), "plain", "plain", lips=12, glasses="square"), 8)
