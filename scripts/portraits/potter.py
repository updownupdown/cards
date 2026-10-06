from dsl import catmull
from parts import framed, hair_updo

# Hair drawn back into a bun, a high-necked blouse.


def draw():
    return catmull(framed(*hair_updo(bun=True), "high", "lace", lips=9), 8)
