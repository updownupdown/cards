from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side

# Side-parted hair, a moustache, a high collar.


def draw():
    return catmull(left_side("high") + crown_short() + eyes_rl(lid=0.8) + lower_moustache(droop=4) + right_side("high"), 8)
