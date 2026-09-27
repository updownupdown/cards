from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit") + crown_bald_sides() + eyes_rl(heavy=True, lid=0.9) + lower_lips(w=11) + right_side("tie"), 8)
