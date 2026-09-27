from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_smile, right_side


def draw():
    return catmull(left_side("suit") + crown_short() + eyes_rl(lid=0.8) + lower_smile(y=156) + right_side("tie"), 8)
