from dsl import catmull
from parts import framed, hair_down

# Long 1970s hair, centre-parted, an open collar.


def draw():
    return catmull(framed(*hair_down(bottom=150, spread=4), "plain", "plain", lips=10), 8)
