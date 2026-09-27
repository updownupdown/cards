from dsl import catmull
from parts import crown_messy, eyes_rl, left_side, lower_moustache, right_side


def draw():
    return catmull(left_side("suit") + crown_messy(volume=4) + eyes_rl(heavy=True) + lower_moustache(droop=8) + right_side("bowtie"), 8)
