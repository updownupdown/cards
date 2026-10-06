from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_beard, right_side

# Short hair, glasses and a beard.


def draw():
    return catmull(left_side("plain", beard="wavy") + crown_short(part=False) + eyes_rl(glasses="square") + lower_beard("wavy", bottom=186, width=26) + right_side("plain"), 8)
