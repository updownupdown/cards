from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_beard, right_side

# Short hair, pince-nez, a short pointed beard.


def draw():
    return catmull(left_side("suit", beard="wavy") + crown_short(part=False) + eyes_rl(glasses="round") + lower_beard("wavy", bottom=200, width=26, point=True) + right_side("suit"), 8)
