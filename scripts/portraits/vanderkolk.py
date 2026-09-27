from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("plain", beard="wavy") + crown_dome() + eyes_rl(glasses="round") + lower_beard("wavy", bottom=184, width=26) + right_side("plain"), 8)
