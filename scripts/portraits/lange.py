from dsl import catmull
from parts import framed, hair_down

# Short hair with a fringe, a plain collar.


def draw():
    return catmull(framed(*hair_down(bottom=148, spread=2, fringe=True), "plain", "plain", lips=10), 8)
