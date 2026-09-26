from dsl import catmull
from parts import crown_topknot, eyes_rl, left_side, lower_wispy, right_side
def draw():
    return catmull(left_side("robe") + crown_topknot() + eyes_rl() + lower_wispy() + right_side("robe"), 8)
