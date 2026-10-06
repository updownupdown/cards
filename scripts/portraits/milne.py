from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Side-parted hair, clean-shaven, suit and tie.


def draw():
    return catmull(left_side("suit") + crown_short() + eyes_rl() + lower_lips(w=11) + right_side("tie"), 8)
