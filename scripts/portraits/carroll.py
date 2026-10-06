from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Wavy hair over the ears, clean-shaven, a bow tie.


def draw():
    return catmull(left_side("high") + crown_swept(volume=2) + eyes_rl(lid=0.9) + lower_lips(w=10) + right_side("bowtie"), 8)
