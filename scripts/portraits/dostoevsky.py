from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("suit", beard="wavy") + crown_bald_sides() + eyes_rl(lid=0.8) + lower_beard("wavy", bottom=206, width=28, point=True) + right_side("suit"), 8)
