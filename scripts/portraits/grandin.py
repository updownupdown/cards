from dsl import catmull
from parts import framed, hair_short

# Short curly hair, a western shirt.


def draw():
    return catmull(framed(*hair_short(curly=True, swept=False), "high", "high", lips=10), 8)
