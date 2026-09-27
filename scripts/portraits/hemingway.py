from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("plain", beard="curly") + crown_short(part=False, height=-4) + eyes_rl(lid=0.8) + lower_beard("curly", bottom=196, width=30) + right_side("turtleneck"), 8)
