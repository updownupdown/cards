from dsl import catmull
from parts import framed, hair_down


def draw():
    return catmull(framed(*hair_down(bottom=160, spread=6, fringe=True), "suit", "suit", lips=10), 8)
