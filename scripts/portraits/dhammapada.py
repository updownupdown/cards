from dsl import catmull
from parts import crown_ushnisha, eyes_rl, left_side, lower_lips, right_side
def draw():
    return catmull(left_side("robe", long_ear=True) + crown_ushnisha() + eyes_rl(closed=True)
                   + lower_lips(w=9) + right_side("robe"), 8)
