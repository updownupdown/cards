from dsl import catmull
from parts import crown_topknot, eyes_rl, left_side, lower_wispy, right_side


def draw():
    return catmull(left_side("robe") + crown_topknot() + eyes_rl(lid=0.7) + lower_wispy() + right_side("turtleneck"), 8)
