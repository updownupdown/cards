from dsl import catmull
from parts import framed, hair_updo

# Dark hair in a ballerina's bun, a long neck.


def draw():
    return catmull(framed(*hair_updo(bun=True), "plain", "lace", lips=10), 8)
