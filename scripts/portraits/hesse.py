from dsl import catmull
from parts import crown_shaved, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_shaved() + eyes_rl(glasses="round") + lower_lips(w=10) + right_side("suit"), 8)
