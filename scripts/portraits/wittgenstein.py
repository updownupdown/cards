from dsl import catmull
from parts import crown_curly_cap, eyes_rl, left_side, lower_lips, right_side

# Short curly hair, an intense gaze, an open collar.


def draw():
    return catmull(left_side("plain") + crown_curly_cap(count=12, radius=4) + eyes_rl(heavy=True) + lower_lips(w=10) + right_side("plain"), 8)
