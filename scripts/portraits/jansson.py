from dsl import catmull
from parts import framed, hair_short

# Short hair swept back from the face.


def draw():
    return catmull(framed(*hair_short(), "plain", "plain", lips=10), 8)
