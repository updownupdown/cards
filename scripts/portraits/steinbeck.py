from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_goatee, right_side


def draw():
    return catmull(left_side("suit") + crown_swept(volume=0) + eyes_rl(heavy=True) + lower_goatee(length=188) + right_side("suit"), 8)
