from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_smile, right_side

# Close-cropped hair and a broad smile.


def draw():
    return catmull(left_side("plain") + crown_short(part=False, height=-4) + eyes_rl() + lower_smile() + right_side("plain"), 8)
