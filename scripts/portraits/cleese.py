from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_short(height=4) + eyes_rl(heavy=True) + lower_lips(w=12) + right_side("tie"), 8)
