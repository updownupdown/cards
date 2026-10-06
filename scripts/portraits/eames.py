from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Short side-parted hair, a bow tie.


def draw():
    return catmull(left_side("suit") + crown_short(height=-2) + eyes_rl() + lower_lips(w=11) + right_side("bowtie"), 8)
