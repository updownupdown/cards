from dsl import catmull
from parts import crown_mane, eyes_rl, left_side, lower_beard, right_side
def draw():
    return catmull(left_side("suit", beard="wavy", ear=False) + crown_mane() + eyes_rl(heavy=True)
                   + lower_beard("wavy", bottom=196, width=30) + right_side("bowtie"), 8)
