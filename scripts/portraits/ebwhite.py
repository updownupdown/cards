from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side

# Side-parted hair and a trim moustache, a tie.


def draw():
    return catmull(left_side("suit") + crown_short() + eyes_rl() + lower_moustache(droop=2) + right_side("tie"), 8)
