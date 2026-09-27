from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_smile, right_side


def draw():
    return catmull(left_side("plain") + crown_dome() + eyes_rl(glasses="square") + lower_smile(y=156) + right_side("plain"), 8)
