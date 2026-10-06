from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# A lean face under a close cap, a turtleneck.


def draw():
    return catmull(left_side("plain") + crown_short(part=False, height=4) + eyes_rl(lid=0.8) + lower_lips(w=11) + right_side("turtleneck"), 8)
