from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_beard, right_side

# Long swept-back hair, heavy brows, a long flowing beard, a robe.


def draw():
    return catmull(left_side("robe", beard="wavy", ear=False) + crown_swept(ear=False, volume=4) + eyes_rl(heavy=True) + lower_beard("wavy", bottom=230, width=32) + right_side("robe"), 8)
