from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_beard, right_side

# Swept hair and a long, wild beard.


def draw():
    return catmull(left_side("suit", beard="wavy", ear=False) + crown_swept(ear=False, volume=2) + eyes_rl(heavy=True) + lower_beard("wavy", bottom=228, width=30) + right_side("suit"), 8)
