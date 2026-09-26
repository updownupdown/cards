from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_lips, right_side
def draw():
    return catmull(left_side("high", tuft=True) + crown_bald_sides() + eyes_rl()
                   + lower_lips(w=10) + right_side("high"), 8)
