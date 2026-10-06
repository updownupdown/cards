from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Wavy hair swept back, a long face, a high collar and cravat.


def draw():
    return catmull(left_side("high") + crown_swept(volume=6) + eyes_rl(lid=0.8) + lower_lips(w=11) + right_side("high"), 8)
