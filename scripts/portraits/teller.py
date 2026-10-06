from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Short dark hair, heavy brows, a silent closed mouth, suit and tie.


def draw():
    return catmull(left_side("suit") + crown_short(height=-2) + eyes_rl(heavy=True) + lower_lips(w=9) + right_side("tie"), 8)
