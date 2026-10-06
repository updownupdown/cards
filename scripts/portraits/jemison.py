from dsl import catmull
from parts import framed, hair_short

# Short natural hair, a warm smile.


def draw():
    return catmull(framed(*hair_short(curly=True), "plain", "plain", lips=12), 8)
