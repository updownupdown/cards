from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_beard, right_side


def draw():
    return catmull(left_side("robe", beard="wavy", ear=False) + crown_swept(volume=2) + eyes_rl(heavy=True) + lower_beard("wavy", bottom=230, width=34) + right_side("robe"), 8)
