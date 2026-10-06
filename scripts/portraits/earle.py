from dsl import catmull
from parts import framed, hair_short

# Short silver hair swept back.


def draw():
    return catmull(framed(*hair_short(), "plain", "plain", lips=12), 8)
