from dsl import catmull
from parts import crown_wisps, eyes_rl, left_side, lower_beard, right_side
def draw():
    return catmull(left_side("robe", beard="wavy", ear=False) + crown_wisps() + eyes_rl(lid=0.8)
                   + lower_beard("wavy", bottom=188, width=28) + right_side("robe"), 8)
