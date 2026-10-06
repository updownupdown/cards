from dsl import catmull
from parts import framed, hair_down

# Short hair with a straight fringe.


def draw():
    return catmull(framed(*hair_down(bottom=150, spread=6, fringe=True), "plain", "plain", lips=10), 8)
