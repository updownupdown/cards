from dsl import catmull
from parts import framed, hair_down


def draw():
    return catmull(framed(*hair_down(bottom=160, spread=10, wave=2), "plain", "plain", lips=12), 8)
