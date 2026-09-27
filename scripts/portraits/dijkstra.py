from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("suit", beard="wavy") + crown_bald_sides() + eyes_rl(glasses="square") + lower_beard("wavy", bottom=192, width=28) + right_side("suit"), 8)
