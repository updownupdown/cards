from dsl import catmull
from parts import crown_curly_cap, eyes_rl, left_side, lower_beard, right_side
def draw():
    return catmull(left_side("robe", beard="curly", ear=False) + crown_curly_cap() + eyes_rl()
                   + lower_beard("curly", bottom=214, width=32) + right_side("robe"), 8)
