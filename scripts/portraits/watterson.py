from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_moustache, right_side

# Short hair and a moustache.


def draw():
    return catmull(left_side("plain") + crown_short(part=False) + eyes_rl() + lower_moustache(droop=3) + right_side("plain"), 8)
