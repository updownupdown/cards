from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("plain", beard="wavy") + crown_swept(volume=2) + eyes_rl(lid=0.8) + lower_beard("wavy", bottom=198, width=30) + right_side("plain"), 8)
