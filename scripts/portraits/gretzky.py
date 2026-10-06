from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Feathered hair, a boyish face.


def draw():
    return catmull(left_side("plain") + crown_swept(volume=2) + eyes_rl() + lower_lips(w=11) + right_side("plain"), 8)
