from dsl import catmull
from parts import framed, hair_updo

# Hair pinned up, round glasses.


def draw():
    return catmull(framed(*hair_updo(bun=True), "plain", "plain", lips=9, glasses="round"), 8)
