from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_pipe, right_side

# Short parted hair, and a pipe.


def draw():
    return catmull(left_side("suit") + crown_short(height=-2) + eyes_rl(lid=0.8) + lower_pipe() + right_side("tie"), 8)
