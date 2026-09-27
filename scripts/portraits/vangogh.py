from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("suit", beard="curly") + crown_short(part=False) + eyes_rl(lid=0.8) + lower_beard("curly", bottom=190, width=28) + right_side("suit"), 8)
