from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_smile, right_side

# Side-parted hair, square glasses, a smile, suit and tie.


def draw():
    return catmull(left_side("suit") + crown_short() + eyes_rl(glasses="square") + lower_smile() + right_side("tie"), 8)
