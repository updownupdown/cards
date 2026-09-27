from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side


def draw():
    return catmull(left_side("suit", beard="wavy") + crown_short(height=2) + eyes_rl(glasses="square") + lower_lips(w=12) + right_side("bowtie"), 8)
