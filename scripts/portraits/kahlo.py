from dsl import catmull
from parts import framed, hair_updo

# Hair braided up into a crown, a loose blouse.


def draw():
    return catmull(framed(*hair_updo(bun=True), "robe", "robe", lips=11), 8)
