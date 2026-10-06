from dsl import catmull
from parts import framed, hair_down

# Short fair hair, swept back.


def draw():
    return catmull(framed(*hair_down(bottom=150, spread=4, wave=1.5), "plain", "plain", lips=10), 8)
