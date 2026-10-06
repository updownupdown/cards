from dsl import catmull
from parts import crown_curly_cap, eyes_rl, left_side, lower_moustache, right_side

# Curly hair, a toothbrush moustache, a bow tie.


def draw():
    return catmull(left_side("suit") + crown_curly_cap(count=12, radius=5) + eyes_rl(lid=1.2) + lower_moustache(droop=0) + right_side("bowtie"), 8)
