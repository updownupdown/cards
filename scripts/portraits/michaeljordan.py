from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_smile, right_side

# A shaved head and a broad smile.


def draw():
    return catmull(left_side("plain") + crown_dome() + eyes_rl() + lower_smile() + right_side("plain"), 8)
