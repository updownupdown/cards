from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_goatee, right_side

# Short hair, a moustache and a goatee.


def draw():
    return catmull(left_side("suit") + crown_short(part=False, height=-2) + eyes_rl(heavy=True) + lower_goatee(length=188) + right_side("suit"), 8)
