from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_moustache, right_side

# Short swept hair and a moustache.


def draw():
    return catmull(left_side("plain") + crown_swept(volume=0) + eyes_rl(lid=0.9) + lower_moustache(droop=2) + right_side("plain"), 8)
