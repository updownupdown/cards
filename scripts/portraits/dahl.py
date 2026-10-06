from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Receding hair, a long face, a cardigan.


def draw():
    return catmull(left_side("plain") + crown_short(height=4) + eyes_rl() + lower_lips(w=11) + right_side("plain"), 8)
