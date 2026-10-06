from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_smile, right_side

# Short combed hair, a gentle smile, a sweater.


def draw():
    return catmull(left_side("plain") + crown_short(height=-2) + eyes_rl(lid=0.8) + lower_smile(y=154) + right_side("turtleneck"), 8)
