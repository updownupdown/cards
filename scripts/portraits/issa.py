from dsl import catmull
from parts import crown_shaved, eyes_rl, left_side, lower_smile, right_side

# A shaven head, a smile, a robe.


def draw():
    return catmull(left_side("robe") + crown_shaved() + eyes_rl(lid=0.7) + lower_smile(y=152) + right_side("robe"), 8)
