from dsl import catmull
from parts import crown_curly_cap, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_curly_cap(count=14, radius=3.5) + eyes_rl(lid=1.4) + lower_lips(w=13) + right_side("tie"), 8)
