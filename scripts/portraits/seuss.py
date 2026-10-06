from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_beard, right_side

# Swept hair, a neat beard, a bow tie.


def draw():
    return catmull(left_side("suit", beard="wavy") + crown_swept(volume=2) + eyes_rl(lid=0.9) + lower_beard("wavy", bottom=184, width=24) + right_side("bowtie"), 8)
