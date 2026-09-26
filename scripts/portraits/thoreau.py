from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_neck_beard, right_side
def draw():
    return catmull(left_side("high") + crown_short(height=6) + eyes_rl()
                   + lower_neck_beard() + right_side("high"), 8)
