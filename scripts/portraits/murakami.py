from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("plain") + crown_short(part=False, height=-2) + eyes_rl(lid=0.7) + lower_lips(w=11) + right_side("plain"), 8)
