from dsl import catmull
from parts import framed, hair_down

# A short bob, parted, a flight-suit collar.


def draw():
    return catmull(framed(*hair_down(bottom=156, spread=8), "high", "high", lips=11), 8)
