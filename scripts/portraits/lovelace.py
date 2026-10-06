from dsl import catmull
from parts import framed, hair_down

# Centre-parted hair falling in waves, a lace collar.


def draw():
    return catmull(framed(*hair_down(bottom=152, spread=10, wave=2), "plain", "lace", lips=9), 8)
