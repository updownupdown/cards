from dsl import catmull
from parts import framed, hair_short

# Short curled hair and a broad smile.


def draw():
    return catmull(framed(*hair_short(curly=True), "plain", "plain", lips=13), 8)
