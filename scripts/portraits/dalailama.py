from dsl import catmull
from parts import crown_shaved, eyes_rl, left_side, lower_smile, right_side
def draw():
    return catmull(left_side("robe") + crown_shaved() + eyes_rl(glasses="square")
                   + lower_smile() + right_side("robe"), 8)
