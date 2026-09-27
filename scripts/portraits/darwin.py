from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("suit", beard="wavy", ear=False) + crown_dome() + eyes_rl(heavy=True) + lower_beard("wavy", bottom=226, width=32) + right_side("suit"), 8)
