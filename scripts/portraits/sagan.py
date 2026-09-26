from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side
def draw():
    return catmull(left_side("suit") + crown_swept(volume=0) + eyes_rl()
                   + lower_lips(w=12) + right_side("turtleneck"), 8)
