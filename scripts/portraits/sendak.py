from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_beard, right_side

# Bald on top, glasses and a beard.


def draw():
    return catmull(left_side("plain", beard="wavy", ear=False) + crown_bald_sides(ear=False) + eyes_rl(glasses="square") + lower_beard("wavy", bottom=190, width=26) + right_side("plain"), 8)
