from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_goatee, right_side

# Short hair, a goatee, suit and tie.


def draw():
    return catmull(left_side("suit") + crown_short(part=False, height=-2) + eyes_rl(lid=0.7) + lower_goatee(length=190) + right_side("tie"), 8)
