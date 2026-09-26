from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side
def draw():
    return catmull(left_side("suit") + crown_short(height=-6) + eyes_rl()
                   + lower_moustache() + right_side("tie"), 8)
