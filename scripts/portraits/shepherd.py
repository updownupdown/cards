from dsl import catmull
from parts import framed, hair_down

# Hair falling to the jaw under a headband.


def draw():
    return catmull(framed(*hair_down(bottom=160, spread=6, wave=1.5), "plain", "plain", lips=10), 8)
