from dsl import catmull
from parts import crown_messy, eyes_rl, left_side, lower_lips, right_side

# Swept-back curling hair, a high collar and cravat.


def draw():
    return catmull(left_side("high") + crown_messy(volume=4) + eyes_rl() + lower_lips(w=10) + right_side("high"), 8)
