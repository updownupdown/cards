from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_moustache, right_side

# Bald, round glasses, a small moustache.


def draw():
    return catmull(left_side("suit") + crown_dome() + eyes_rl(glasses="round") + lower_moustache(droop=1) + right_side("tie"), 8)
