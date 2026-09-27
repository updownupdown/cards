from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side


def draw():
    return catmull(left_side("high") + crown_short(height=-4) + eyes_rl(lid=1.2) + lower_moustache(droop=7) + right_side("high"), 8)
