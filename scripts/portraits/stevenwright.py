from dsl import catmull
from parts import crown_messy, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("plain") + crown_messy(volume=8) + eyes_rl(lid=0.4) + lower_lips(w=11) + right_side("plain"), 8)
