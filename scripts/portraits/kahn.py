from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_lips, right_side

# Wisps of white hair, round glasses, a bow tie.


def draw():
    return catmull(left_side("suit") + crown_bald_sides() + eyes_rl(glasses="round") + lower_lips(w=11) + right_side("bowtie"), 8)
