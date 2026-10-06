from dsl import catmull
from parts import framed, hair_short

# Short wavy hair, parted, a plain collar.


def draw():
    return catmull(framed(*hair_short(swept=False), "plain", "plain", lips=10), 8)
