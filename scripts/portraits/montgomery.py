from dsl import catmull
from parts import framed, hair_updo

# Hair swept up in the Edwardian way, a high-necked blouse.


def draw():
    return catmull(framed(*hair_updo(), "high", "high", lips=10), 8)
