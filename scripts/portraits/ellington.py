from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_moustache, right_side

# Hair slicked back, a pencil moustache, suit and tie.


def draw():
    return catmull(left_side("suit") + crown_swept(volume=-4) + eyes_rl(lid=0.8) + lower_moustache(droop=1) + right_side("tie"), 8)
