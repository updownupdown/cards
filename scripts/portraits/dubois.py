from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_goatee, right_side
def draw():
    return catmull(left_side("suit") + crown_dome() + eyes_rl() + lower_goatee() + right_side("tie"), 8)
