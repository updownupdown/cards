from dsl import catmull
from parts import crown_dome, eyes_rl, left_side, lower_lips, right_side
def draw():
    return catmull(left_side("suit") + crown_dome() + eyes_rl(glasses="round")
                   + lower_lips() + right_side("bowtie"), 8)
