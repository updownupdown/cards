from dsl import catmull
from parts import crown_messy, eyes_rl, left_side, lower_moustache, right_side


def draw():
    return catmull(left_side("suit") + crown_messy(volume=6) + eyes_rl(lid=0.8) + lower_moustache(droop=6) + right_side("suit"), 8)
