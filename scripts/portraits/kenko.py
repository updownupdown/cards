from dsl import catmull
from parts import crown_shaved, eyes_rl, left_side, lower_lips, right_side

# A monk's shaven head and robe.


def draw():
    return catmull(left_side("robe") + crown_shaved() + eyes_rl(lid=0.6) + lower_lips(w=10) + right_side("robe"), 8)
