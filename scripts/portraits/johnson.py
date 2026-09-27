from dsl import catmull
from parts import crown_curls, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("high", ear=False) + crown_curls(count=10, radius=7) + eyes_rl(heavy=True) + lower_lips(w=12) + right_side("high"), 8)
