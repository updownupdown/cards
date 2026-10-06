from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Short combed hair, glasses, a cardigan.


def draw():
    return catmull(left_side("plain") + crown_short(height=-2) + eyes_rl(glasses="square") + lower_lips(w=10) + right_side("turtleneck"), 8)
