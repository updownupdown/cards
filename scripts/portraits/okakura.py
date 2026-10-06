from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side

# Short hair, a moustache, a crossed robe.


def draw():
    return catmull(left_side("robe") + crown_short(part=False) + eyes_rl() + lower_moustache(droop=4) + right_side("robe"), 8)
