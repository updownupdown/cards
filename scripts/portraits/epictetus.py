from dsl import catmull
from parts import crown_bald_sides, eyes_rl, left_side, lower_beard, right_side
def draw():
    return catmull(left_side("robe", beard="wavy", ear=False, tuft=True) + crown_bald_sides(ear=False)
                   + eyes_rl(heavy=True) + lower_beard("wavy", bottom=220, width=30, point=True)
                   + right_side("robe"), 8)
