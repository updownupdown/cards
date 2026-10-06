from dsl import catmull
from parts import crown_curls, eyes_rl, left_side, lower_lips, right_side

# A great curled wig, a lace cravat.


def draw():
    return catmull(left_side("high", ear=False) + crown_curls(count=11, radius=8) + eyes_rl(lid=0.9) + lower_lips(w=10) + right_side("lace"), 8)
