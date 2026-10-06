from dsl import catmull
from parts import INNER_FRINGE, framed, hair_short

# Short hair with a fringe and big round glasses.


def draw():
    return catmull(framed(hair_short()[0], INNER_FRINGE, "plain", "plain", lips=10, glasses="round"), 8)
