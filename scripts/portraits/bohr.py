from dsl import catmull
from parts import crown_swept, eyes_rl, left_side, lower_lips, right_side
def draw():
    return catmull(left_side("suit") + crown_swept(volume=-6) + eyes_rl(heavy=True, lid=0.8)
                   + lower_lips(w=13) + right_side("tie"), 8)
