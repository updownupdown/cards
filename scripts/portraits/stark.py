from dsl import catmull
from parts import framed, hair_cloche

# A close-fitting hat low over the brow.


def draw():
    return catmull(framed(*hair_cloche(), "plain", "plain", lips=10), 8)
