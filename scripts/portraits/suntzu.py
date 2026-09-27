from dsl import catmull
from parts import crown_topknot, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("robe") + crown_topknot() + eyes_rl() + lower_beard("wavy", bottom=206, width=26, point=True) + right_side("robe"), 8)
