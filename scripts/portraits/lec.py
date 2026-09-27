from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_moustache, right_side


def draw():
    return catmull(left_side("suit") + crown_dome() + eyes_rl(lid=0.8) + lower_moustache(droop=0) + right_side("tie"), 8)
