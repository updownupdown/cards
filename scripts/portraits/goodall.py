from dsl import catmull
from parts import framed, hair_updo

# Hair drawn back in a ponytail, a plain shirt.


def draw():
    return catmull(framed(*hair_updo(), "plain", "plain", lips=10), 8)
