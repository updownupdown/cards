from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_dome() + eyes_rl(heavy=True) + lower_lips(w=12) + right_side("tie"), 8)
