from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_lips, right_side

# A bald dome, clean-shaven, an open collar.


def draw():
    return catmull(left_side("plain") + crown_dome() + eyes_rl(lid=0.8) + lower_lips(w=11) + right_side("plain"), 8)
