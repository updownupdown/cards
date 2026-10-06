from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Swept-back hair, heavy brows, a jacket.


def draw():
    return catmull(left_side("suit") + crown_swept(volume=4) + eyes_rl(heavy=True) + lower_lips(w=11) + right_side("suit"), 8)
