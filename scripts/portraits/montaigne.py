from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_goatee, right_side
def draw():
    return catmull(left_side("plain", tuft=True) + crown_bald_sides() + eyes_rl()
                   + lower_goatee(length=188) + right_side("ruff"), 8)
