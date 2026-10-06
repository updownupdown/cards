from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_lips, right_side

# A traveller's shaven head, eyes half closed, a robe.


def draw():
    return catmull(left_side("robe", ear=False) + crown_dome(ear=False) + eyes_rl(lid=0.5) + lower_lips(w=9) + right_side("robe"), 8)
