from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("plain", beard="wavy", ear=False) + crown_swept(volume=6, ear=False) + eyes_rl(lid=0.9) + lower_beard("wavy", bottom=200, width=30) + right_side("plain"), 8)
