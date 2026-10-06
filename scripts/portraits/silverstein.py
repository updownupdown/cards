from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_beard, right_side

# A shaved head and a full beard.


def draw():
    return catmull(left_side("plain", beard="curly", ear=False) + crown_dome(ear=False) + eyes_rl(heavy=True) + lower_beard("curly", bottom=200, width=30) + right_side("plain"), 8)
