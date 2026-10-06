from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Short grey hair, heavy-lidded eyes, suit and tie.


def draw():
    return catmull(left_side("suit") + crown_short(part=False, height=-4) + eyes_rl(lid=0.6) + lower_lips(w=11) + right_side("tie"), 8)
