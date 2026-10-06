from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Short side-parted hair, glasses.


def draw():
    return catmull(left_side("plain") + crown_short() + eyes_rl(glasses="square") + lower_lips(w=11) + right_side("plain"), 8)
