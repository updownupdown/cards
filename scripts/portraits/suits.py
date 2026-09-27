from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side


def draw():
    return catmull(left_side("suit") + crown_short() + eyes_rl(glasses="square") + lower_moustache(droop=2) + right_side("suit"), 8)
