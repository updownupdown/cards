from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_beard, right_side

# Bald on top, pince-nez and a pointed beard.


def draw():
    return catmull(left_side("suit", beard="wavy", ear=False) + crown_bald_sides() + eyes_rl(glasses="round") + lower_beard("wavy", bottom=212, width=28, point=True) + right_side("suit"), 8)
