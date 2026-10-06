from dsl import catmull
from parts import framed, hair_short

# Short tousled curls, an open flying collar.


def draw():
    return catmull(framed(*hair_short(curly=True, swept=False), "plain", "plain", lips=12), 8)
