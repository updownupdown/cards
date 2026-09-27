from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_short(part=False, height=-8) + eyes_rl(glasses="round") + lower_lips(w=11) + right_side("tie"), 8)
