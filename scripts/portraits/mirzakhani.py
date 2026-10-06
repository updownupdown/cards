from dsl import catmull
from parts import framed, hair_short

# Short hair close to the head, a warm smile.


def draw():
    return catmull(framed(*hair_short(swept=False), "plain", "plain", lips=12), 8)
