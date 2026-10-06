from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Side-parted hair, heavy brows, a work shirt.


def draw():
    return catmull(left_side("plain") + crown_short(height=2) + eyes_rl(heavy=True) + lower_lips(w=10) + right_side("plain"), 8)
