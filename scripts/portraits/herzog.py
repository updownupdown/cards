from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_short(height=-2) + eyes_rl(heavy=True, lid=0.8) + lower_lips(w=11) + right_side("suit"), 8)
