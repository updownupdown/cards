from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Short parted hair, clean-shaven, a high collar.


def draw():
    return catmull(left_side("high") + crown_short() + eyes_rl(lid=0.9) + lower_lips(w=10) + right_side("high"), 8)
