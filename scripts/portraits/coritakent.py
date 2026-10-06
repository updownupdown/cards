from dsl import catmull
from parts import INNER_FRINGE, framed, hair_short

# Short hair with a fringe, round glasses.


def draw():
    return catmull(framed(hair_short()[0], INNER_FRINGE, "robe", "robe", lips=11, glasses="round"), 8)
