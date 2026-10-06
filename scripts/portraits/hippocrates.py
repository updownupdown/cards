from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_beard, right_side

# A bald dome and a curly beard (the Ostia bust).


def draw():
    return catmull(left_side("robe", beard="curly", ear=False) + crown_dome(ear=False) + eyes_rl(heavy=True) + lower_beard("curly", bottom=204, width=30) + right_side("robe"), 8)
