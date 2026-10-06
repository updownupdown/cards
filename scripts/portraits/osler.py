from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_moustache, right_side

# Receding hair and a drooping moustache, a high collar.


def draw():
    return catmull(left_side("high") + crown_bald_sides() + eyes_rl() + lower_moustache(droop=6) + right_side("high"), 8)
