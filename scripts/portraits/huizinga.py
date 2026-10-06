from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Slicked-back hair, round glasses, a high collar.


def draw():
    return catmull(left_side("high") + crown_swept(volume=-4) + eyes_rl(glasses="round") + lower_lips(w=10) + right_side("high"), 8)
