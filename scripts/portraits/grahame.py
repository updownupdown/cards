from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_moustache, right_side

# Hair swept back, a full moustache, a high collar and cravat.


def draw():
    return catmull(left_side("high") + crown_swept() + eyes_rl() + lower_moustache(droop=3) + right_side("high"), 8)
