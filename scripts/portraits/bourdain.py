from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Swept grey hair, a lean face, an open collar.


def draw():
    return catmull(left_side("plain") + crown_swept(volume=4) + eyes_rl(lid=0.8) + lower_lips(w=12) + right_side("plain"), 8)
