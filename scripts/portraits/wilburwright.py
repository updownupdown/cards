from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_lips, right_side

# A bald dome, clean-shaven, a high starched collar.


def draw():
    return catmull(left_side("high") + crown_dome() + eyes_rl(lid=0.9) + lower_lips(w=10) + right_side("high"), 8)
