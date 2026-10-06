from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_smile, right_side

# Swept white hair, a smile, an open collar.


def draw():
    return catmull(left_side("plain") + crown_swept(volume=2) + eyes_rl(lid=0.9) + lower_smile(y=154) + right_side("plain"), 8)
