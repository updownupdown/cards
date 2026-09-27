from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_smile, right_side


def draw():
    return catmull(left_side("suit") + crown_dome() + eyes_rl(glasses="round") + lower_smile(y=154) + right_side("tie"), 8)
