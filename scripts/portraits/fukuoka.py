from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_wispy, right_side

# A bald head, a wispy moustache and beard.


def draw():
    return catmull(left_side("plain") + crown_dome() + eyes_rl(lid=0.7) + lower_wispy() + right_side("plain"), 8)
