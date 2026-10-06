from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side

# Swept-back hair, dark square glasses, an open collar.


def draw():
    return catmull(left_side("plain") + crown_swept(volume=0) + eyes_rl(glasses="square") + lower_lips(w=11) + right_side("plain"), 8)
