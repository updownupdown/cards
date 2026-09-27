from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_smile, right_side


def draw():
    return catmull(left_side("plain") + crown_short(part=False, height=-6) + eyes_rl(lid=0.9) + lower_smile(y=152) + right_side("plain"), 8)
