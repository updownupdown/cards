from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_smile, right_side


def draw():
    return catmull(left_side("suit") + crown_swept(volume=4) + eyes_rl() + lower_smile(y=152) + right_side("tie"), 8)
