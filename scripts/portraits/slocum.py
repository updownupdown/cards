from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_beard, right_side

# A bald dome, a full beard and moustache.


def draw():
    return catmull(left_side("suit", beard="wavy", ear=False) + crown_dome(ear=False) + eyes_rl() + lower_beard("wavy", bottom=206, width=28) + right_side("suit"), 8)
