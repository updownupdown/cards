from dsl import catmull
from parts import framed, hair_down

# Long straight hair, parted.


def draw():
    return catmull(framed(*hair_down(bottom=192, spread=8), "plain", "plain", lips=11), 8)
