from dsl import catmull
from parts import crown_shaved, eyes_rl, left_side, lower_lips, right_side
def draw():
    return catmull(left_side("robe", ear=True) + crown_shaved() + eyes_rl(lid=0.7)
                   + lower_lips(w=10) + right_side("robe"), 8)
