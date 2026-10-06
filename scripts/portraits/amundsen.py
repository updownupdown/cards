from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_lips, right_side

# Receding hair, heavy brows, a polar explorer's high collar.


def draw():
    return catmull(left_side("high") + crown_bald_sides() + eyes_rl(heavy=True) + lower_lips(w=10) + right_side("high"), 8)
