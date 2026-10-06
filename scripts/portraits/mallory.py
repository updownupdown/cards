from dsl import catmull
from parts import framed, hair_short

# Centre-parted hair, a climber's open collar.


def draw():
    return catmull(framed(*hair_short(swept=False), "plain", "plain", lips=10), 8)
