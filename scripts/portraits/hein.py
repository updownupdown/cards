from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_pipe, right_side

# Bald on top with hair over the ears, and his pipe.


def draw():
    return catmull(left_side("suit") + crown_bald_sides() + eyes_rl() + lower_pipe() + right_side("tie"), 8)
