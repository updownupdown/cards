from dsl import catmull
from parts import framed, hair_down


def draw():
    return catmull(framed(*hair_down(bottom=190, spread=10), "plain", "plain", lips=11), 8)
